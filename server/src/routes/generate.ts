import { Router, Request, Response } from 'express'
import Joi from 'joi'
import { aiService } from '../services/aiService'
import { logger } from '../utils/logger'

const router = Router()

const generateSchema = Joi.object({
  prompt: Joi.string().min(10).max(2000).required(),
  currentCode: Joi.string().optional(),
  projectContext: Joi.object({
    name: Joi.string().optional(),
    dependencies: Joi.array().items(Joi.string()).optional(),
    firebase: Joi.boolean().optional()
  }).optional()
})

const improveSchema = Joi.object({
  code: Joi.string().required(),
  instruction: Joi.string().min(5).max(500).required()
})

const explainSchema = Joi.object({
  code: Joi.string().required()
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const { error, value } = generateSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.details.map(d => d.message)
      })
    }

    const { prompt, currentCode, projectContext } = value

    logger.info(`Code generation request: "${prompt.substring(0, 100)}..."`)

    const result = await aiService.generateFlutterCode({
      prompt,
      currentCode,
      projectContext
    })

    res.json({
      success: true,
      code: result.code,
      dependencies: result.dependencies || [],
      explanation: result.explanation,
      files: result.files || []
    })

  } catch (error) {
    logger.error('Error in generate route:', error)

    res.status(500).json({
      error: 'Failed to generate code',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.post('/improve', async (req: Request, res: Response) => {
  try {
    const { error, value } = improveSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.details.map(d => d.message)
      })
    }

    const { code, instruction } = value

    logger.info(`Code improvement request: "${instruction}"`)

    const improvedCode = await aiService.improveCode(code, instruction)

    res.json({
      success: true,
      code: improvedCode
    })

  } catch (error) {
    logger.error('Error in improve route:', error)

    res.status(500).json({
      error: 'Failed to improve code',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

router.post('/explain', async (req: Request, res: Response) => {
  try {
    const { error, value } = explainSchema.validate(req.body)
    if (error) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.details.map(d => d.message)
      })
    }

    const { code } = value

    logger.info('Code explanation request')

    const explanation = await aiService.explainCode(code)

    res.json({
      success: true,
      explanation
    })

  } catch (error) {
    logger.error('Error in explain route:', error)

    res.status(500).json({
      error: 'Failed to explain code',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
})

// Template suggestions endpoint
router.get('/templates', (req: Request, res: Response) => {
  const templates = [
    {
      id: 'counter',
      name: 'Counter App',
      description: 'Simple counter with increment button',
      prompt: 'Create a simple counter app with increment and decrement buttons'
    },
    {
      id: 'todo',
      name: 'Todo List',
      description: 'Todo app with add, delete, and mark complete',
      prompt: 'Create a todo app with add, delete, and mark complete functionality'
    },
    {
      id: 'weather',
      name: 'Weather App',
      description: 'Weather app with current conditions and forecast',
      prompt: 'Build a weather app that shows current conditions and 5-day forecast'
    },
    {
      id: 'calculator',
      name: 'Calculator',
      description: 'Simple calculator with basic operations',
      prompt: 'Make a simple calculator with basic arithmetic operations'
    },
    {
      id: 'gallery',
      name: 'Photo Gallery',
      description: 'Photo gallery with grid view and details',
      prompt: 'Create a photo gallery app with grid view and detail screen'
    },
    {
      id: 'chat',
      name: 'Chat Interface',
      description: 'Chat app with message bubbles',
      prompt: 'Build a chat interface with message bubbles and send functionality'
    },
    {
      id: 'shopping',
      name: 'Shopping Cart',
      description: 'Shopping app with products and cart',
      prompt: 'Make a shopping cart app with products, cart, and checkout'
    },
    {
      id: 'fitness',
      name: 'Fitness Tracker',
      description: 'Fitness app with step counter and progress',
      prompt: 'Create a fitness tracker with step counter and progress charts'
    }
  ]

  res.json({
    success: true,
    templates
  })
})

// Code snippets endpoint
router.get('/snippets', (req: Request, res: Response) => {
  const snippets = [
    {
      id: 'stateful_widget',
      name: 'Stateful Widget',
      code: `class MyWidget extends StatefulWidget {
  @override
  _MyWidgetState createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  @override
  Widget build(BuildContext context) {
    return Container();
  }
}`,
      description: 'Basic stateful widget structure'
    },
    {
      id: 'listview_builder',
      name: 'ListView Builder',
      code: `ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) {
    return ListTile(
      title: Text(items[index]),
    );
  },
)`,
      description: 'Efficient list with builder pattern'
    },
    {
      id: 'firebase_auth',
      name: 'Firebase Authentication',
      code: `Future<User?> signInWithEmailAndPassword(String email, String password) async {
  try {
    final credential = await FirebaseAuth.instance.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
    return credential.user;
  } catch (e) {
    print('Error signing in: \$e');
    return null;
  }
}`,
      description: 'Firebase email/password authentication'
    },
    {
      id: 'http_request',
      name: 'HTTP Request',
      code: `Future<Map<String, dynamic>> fetchData() async {
  final response = await http.get(
    Uri.parse('https://api.example.com/data'),
    headers: {'Content-Type': 'application/json'},
  );

  if (response.statusCode == 200) {
    return json.decode(response.body);
  } else {
    throw Exception('Failed to load data');
  }
}`,
      description: 'Making HTTP requests with proper error handling'
    }
  ]

  res.json({
    success: true,
    snippets
  })
})

export default router