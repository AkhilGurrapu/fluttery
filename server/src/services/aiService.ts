import { GoogleGenerativeAI } from '@google/generative-ai'
import { logger } from '../utils/logger'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
  },
})

export interface CodeGenerationRequest {
  prompt: string
  currentCode?: string
  projectContext?: {
    name: string
    dependencies: string[]
    firebase: boolean
  }
}

export interface CodeGenerationResponse {
  code: string
  explanation?: string
  dependencies?: string[]
  files?: Array<{
    path: string
    content: string
  }>
}

const FLUTTER_SYSTEM_PROMPT = `You are an expert Flutter developer and code generator. Your job is to convert plain English descriptions into high-quality, production-ready Flutter applications with proper file structure.

IMPORTANT: You must respond with a JSON object containing multiple files for a complete Flutter project structure.

Response format:
{
  "explanation": "Brief explanation of what you're building",
  "files": [
    {
      "path": "lib/main.dart",
      "content": "// Flutter code here"
    },
    {
      "path": "lib/screens/home_screen.dart",
      "content": "// Screen code here"
    }
    // ... more files as needed
  ],
  "dependencies": ["package1", "package2"]
}

Key guidelines:
1. Generate complete, runnable Flutter code with proper file structure
2. Use modern Flutter best practices (Flutter 3.x)
3. Create separate files for screens, widgets, models, services
4. Include proper imports and dependencies
5. Follow Material Design principles
6. Add proper error handling and loading states
7. Make code responsive and mobile-friendly
8. Use proper state management (setState, Provider, Bloc, etc.)
9. Ensure code is well-structured with proper separation of concerns
10. Add Firebase integration when requested
11. Include models, services, and utilities in separate files
12. Create reusable widgets in separate files

Always create a proper Flutter project structure with multiple files, not just a single main.dart file.`

const FLUTTER_CODE_EXAMPLES = `
Example 1 - Simple Counter App:
import 'package:flutter/material.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Counter App',
      theme: ThemeData(primarySwatch: Colors.blue),
      home: CounterPage(),
    );
  }
}

class CounterPage extends StatefulWidget {
  @override
  _CounterPageState createState() => _CounterPageState();
}

class _CounterPageState extends State<CounterPage> {
  int _counter = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Counter')),
      body: Center(
        child: Text('$_counter', style: Theme.of(context).textTheme.headlineLarge),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => setState(() => _counter++),
        child: Icon(Icons.add),
      ),
    );
  }
}

Example 2 - Todo App with Firebase:
import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Todo App',
      theme: ThemeData(primarySwatch: Colors.green),
      home: TodoList(),
    );
  }
}

class Todo {
  final String id;
  final String text;
  final bool completed;

  Todo({required this.id, required this.text, this.completed = false});

  Map<String, dynamic> toMap() => {
    'text': text,
    'completed': completed,
    'createdAt': FieldValue.serverTimestamp(),
  };
}

class TodoList extends StatefulWidget {
  @override
  _TodoListState createState() => _TodoListState();
}

class _TodoListState extends State<TodoList> {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final TextEditingController _controller = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Todo List')),
      body: Column(
        children: [
          Padding(
            padding: EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: InputDecoration(hintText: 'Add a todo'),
                  ),
                ),
                IconButton(
                  icon: Icon(Icons.add),
                  onPressed: _addTodo,
                ),
              ],
            ),
          ),
          Expanded(
            child: StreamBuilder<QuerySnapshot>(
              stream: _firestore.collection('todos').snapshots(),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return Center(child: CircularProgressIndicator());
                }
                return ListView.builder(
                  itemCount: snapshot.data!.docs.length,
                  itemBuilder: (context, index) {
                    var todo = snapshot.data!.docs[index];
                    return ListTile(
                      title: Text(todo['text']),
                      trailing: IconButton(
                        icon: Icon(Icons.delete),
                        onPressed: () => _deleteTodo(todo.id),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  void _addTodo() {
    if (_controller.text.isNotEmpty) {
      _firestore.collection('todos').add({
        'text': _controller.text,
        'completed': false,
        'createdAt': FieldValue.serverTimestamp(),
      });
      _controller.clear();
    }
  }

  void _deleteTodo(String id) {
    _firestore.collection('todos').doc(id).delete();
  }
}
`

export class AIService {
  private static instance: AIService

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService()
    }
    return AIService.instance
  }

  async generateFlutterCode(request: CodeGenerationRequest): Promise<CodeGenerationResponse> {
    try {
      logger.info(`Generating Flutter code for prompt: "${request.prompt.substring(0, 100)}..."`)

      let prompt = FLUTTER_SYSTEM_PROMPT + '\n\nHere are some examples:\n' + FLUTTER_CODE_EXAMPLES + '\n\n'

      if (request.currentCode) {
        prompt += `Here is my current Flutter code:\n\`\`\`dart\n${request.currentCode}\n\`\`\`\n\nNow I want to: ${request.prompt}\n\nPlease modify or extend this code to implement the requested functionality. Provide the complete updated code.`
      } else {
        prompt += `Create a Flutter app that: ${request.prompt}\n\nProvide complete, runnable Flutter code with proper structure and best practices.`
      }

      const result = await model.generateContent(prompt)
      const response = await result.response
      let generatedContent = response.text()

      if (!generatedContent) {
        throw new Error('No code generated from AI service')
      }

      // Clean up the response and extract JSON
      generatedContent = generatedContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      try {
        // Try to parse as JSON first
        const jsonResponse = JSON.parse(generatedContent)

        if (jsonResponse.files && Array.isArray(jsonResponse.files)) {
          // Return structured response with multiple files
          logger.info('Flutter project generated successfully with Gemini 2.0 Flash')

          return {
            code: jsonResponse.files.find((f: any) => f.path === 'lib/main.dart')?.content || jsonResponse.files[0]?.content || '',
            dependencies: jsonResponse.dependencies || [],
            explanation: jsonResponse.explanation || `Generated Flutter project for: ${request.prompt}`,
            files: jsonResponse.files || []
          }
        }
      } catch (jsonError) {
        logger.warn('Failed to parse JSON response, falling back to text parsing')
      }

      // Fallback: Extract code from markdown code blocks
      const codeMatch = generatedContent.match(/```(?:dart|flutter)?\n([\s\S]*?)\n```/)
      const code = codeMatch ? codeMatch[1] : generatedContent

      // Extract dependencies from code
      const dependencies = this.extractDependencies(code)

      logger.info('Flutter code generated successfully with Gemini 2.0 Flash (fallback)')

      return {
        code: code.trim(),
        dependencies,
        explanation: `Generated Flutter code for: ${request.prompt}`,
        files: [{
          path: 'lib/main.dart',
          content: code.trim()
        }]
      }

    } catch (error) {
      logger.error('Error generating Flutter code:', error)
      throw new Error(`Failed to generate Flutter code: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private extractDependencies(code: string): string[] {
    const dependencies: string[] = []
    const imports = code.match(/import\s+['"](package:.+?)['"];?/g) || []

    for (const imp of imports) {
      const match = imp.match(/package:([^/]+)/)
      if (match && match[1] && !['flutter'].includes(match[1])) {
        dependencies.push(match[1])
      }
    }

    return Array.from(new Set(dependencies))
  }

  async improveCode(code: string, instruction: string): Promise<string> {
    try {
      const prompt = `${FLUTTER_SYSTEM_PROMPT}\n\nHere is Flutter code:\n\`\`\`dart\n${code}\n\`\`\`\n\nPlease improve it by: ${instruction}\n\nReturn only the improved Flutter code.`

      const result = await model.generateContent(prompt)
      const response = await result.response
      const improvedContent = response.text()

      if (!improvedContent) {
        throw new Error('No improved code generated')
      }

      const codeMatch = improvedContent.match(/```(?:dart|flutter)?\n([\s\S]*?)\n```/)
      return codeMatch ? codeMatch[1].trim() : improvedContent.trim()

    } catch (error) {
      logger.error('Error improving code:', error)
      throw error
    }
  }

  async explainCode(code: string): Promise<string> {
    try {
      const prompt = `You are a Flutter expert. Explain Flutter code in a clear, educational way.\n\nPlease explain this Flutter code:\n\`\`\`dart\n${code}\n\`\`\``

      const result = await model.generateContent(prompt)
      const response = await result.response

      return response.text() || 'Unable to explain code'

    } catch (error) {
      logger.error('Error explaining code:', error)
      throw error
    }
  }
}

export const aiService = AIService.getInstance()