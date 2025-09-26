import { BaseAgent, AgentResult } from '../shared/BaseAgent'
import { AgentMessage, AgentContext } from '../shared/AgentCommunication'

const CODE_SYSTEM_PROMPT = `You are an expert Flutter Code Generation Agent. Your specializations include:

- Flutter/Dart development with latest best practices
- State management (Provider, Riverpod, BLoC, GetX)
- Widget composition and custom widgets
- API integration and data handling
- Performance optimization
- Code architecture patterns (Clean Architecture, MVVM)
- Testing implementation (unit, widget, integration)
- Animation and custom painting
- Platform-specific implementations

RESPONSE FORMAT:
Always respond with a JSON object containing:
{
  "files": [
    {
      "path": "lib/main.dart",
      "content": "// Complete Flutter code here",
      "description": "Brief description of this file's purpose"
    }
  ],
  "dependencies": [
    {
      "name": "package_name",
      "version": "^1.0.0",
      "dev": false,
      "description": "Why this dependency is needed"
    }
  ],
  "stateManagement": {
    "pattern": "Provider" | "Riverpod" | "BLoC" | "GetX" | "setState",
    "rationale": "Why this pattern was chosen"
  },
  "architecture": {
    "pattern": "Clean" | "MVVM" | "MVC" | "Feature-first",
    "folderStructure": ["lib/", "lib/features/", "lib/core/"],
    "description": "Architecture explanation"
  },
  "features": [
    {
      "name": "feature_name",
      "description": "What this feature does",
      "files": ["list", "of", "files"],
      "testing": "Testing approach for this feature"
    }
  ],
  "performance": [
    "List of performance optimizations applied"
  ],
  "accessibility": [
    "List of accessibility implementations"
  ],
  "nextSteps": [
    "Suggested next development steps"
  ],
  "explanation": "Overall code architecture and implementation explanation"
}`

export class CodeAgent extends BaseAgent {
  constructor() {
    super('code-agent', {
      canGenerateCode: true,
      canAnalyzeDesign: true,
      canRunTests: false,
      canOptimize: true,
      canDeploy: false
    }, CODE_SYSTEM_PROMPT)
  }

  async processMessage(message: AgentMessage): Promise<AgentResult> {
    try {
      const { payload } = message
      const context = payload.context as AgentContext

      let prompt = ''

      switch (payload.action) {
        case 'generate_code':
          prompt = this.buildCodeGenerationPrompt(payload.design, payload.requirements)
          break
        case 'optimize_code':
          prompt = this.buildOptimizationPrompt(payload.currentCode, payload.optimizations)
          break
        case 'add_feature':
          prompt = this.buildFeatureAdditionPrompt(payload.currentCode, payload.featureSpec)
          break
        case 'refactor_code':
          prompt = this.buildRefactoringPrompt(payload.currentCode, payload.refactorSpec)
          break
        default:
          throw new Error(`Unknown action: ${payload.action}`)
      }

      const result = await this.callGemini(prompt, context)
      return this.validateResult(result)

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Code generation failed',
        confidence: 0
      }
    }
  }

  private buildCodeGenerationPrompt(design: any, requirements: any): string {
    return `Generate complete Flutter code based on this design specification and requirements:

DESIGN SPECIFICATION:
${JSON.stringify(design, null, 2)}

REQUIREMENTS:
- App Name: ${requirements.appName || 'Flutter App'}
- Platform: ${requirements.platform || 'iOS and Android'}
- Features: ${requirements.features?.join(', ') || 'Basic functionality'}
- State Management Preference: ${requirements.stateManagement || 'Auto-select best option'}
- Database/Storage: ${requirements.storage || 'Local storage'}
- API Integration: ${requirements.apiIntegration || 'None specified'}

Generate production-ready Flutter code that:
1. Implements the complete design specification
2. Uses appropriate state management patterns
3. Includes proper error handling
4. Follows Flutter best practices and conventions
5. Is well-documented with comments
6. Includes basic accessibility features
7. Is optimized for performance
8. Includes folder structure for scalability

Provide complete, working code that can be directly used in a Flutter project.`
  }

  private buildOptimizationPrompt(currentCode: any, optimizations: string[]): string {
    return `Optimize this Flutter code based on the specified optimization requirements:

CURRENT CODE:
${JSON.stringify(currentCode, null, 2)}

OPTIMIZATION REQUIREMENTS:
${optimizations.map(opt => `- ${opt}`).join('\n')}

Apply these optimizations while maintaining:
- Code functionality and behavior
- Readability and maintainability
- Flutter best practices
- Type safety

Provide the optimized code with detailed explanations of improvements made.`
  }

  private buildFeatureAdditionPrompt(currentCode: any, featureSpec: any): string {
    return `Add a new feature to this existing Flutter application:

CURRENT CODEBASE:
${JSON.stringify(currentCode, null, 2)}

NEW FEATURE SPECIFICATION:
Feature Name: ${featureSpec.name}
Description: ${featureSpec.description}
Requirements: ${featureSpec.requirements?.join(', ') || 'Basic implementation'}
UI Requirements: ${featureSpec.uiRequirements || 'Follow existing design patterns'}
Data Requirements: ${featureSpec.dataRequirements || 'Local state only'}

Requirements:
1. Integrate seamlessly with existing codebase
2. Follow established patterns and architecture
3. Maintain consistency in UI/UX
4. Add appropriate error handling
5. Include basic testing setup
6. Update navigation if needed
7. Add any required dependencies

Provide updated code files and new files needed for the feature.`
  }

  private buildRefactoringPrompt(currentCode: any, refactorSpec: any): string {
    return `Refactor this Flutter code according to the specification:

CURRENT CODE:
${JSON.stringify(currentCode, null, 2)}

REFACTORING SPECIFICATION:
Type: ${refactorSpec.type} (e.g., "Extract Widget", "State Management Migration", "Architecture Restructure")
Target: ${refactorSpec.target}
Goal: ${refactorSpec.goal}
Constraints: ${refactorSpec.constraints?.join(', ') || 'None specified'}

Perform the refactoring while ensuring:
1. Functionality remains identical
2. Code becomes more maintainable
3. Performance is improved or maintained
4. Tests continue to pass
5. Dependencies are optimized

Provide the refactored code with explanations of changes made.`
  }
}