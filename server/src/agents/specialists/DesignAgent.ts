import { BaseAgent, AgentResult } from '../shared/BaseAgent'
import { AgentMessage, AgentContext } from '../shared/AgentCommunication'

const DESIGN_SYSTEM_PROMPT = `You are a specialized UI/UX Design Agent for Flutter applications. Your expertise includes:

- Material Design 3 principles and Flutter implementation
- Modern mobile UI patterns and best practices
- Responsive design for multiple screen sizes
- Accessibility compliance (WCAG 2.1)
- Color theory, typography, and visual hierarchy
- User experience optimization for mobile apps

RESPONSE FORMAT:
Always respond with a JSON object containing:
{
  "design": {
    "theme": {
      "primaryColor": "#hexcolor",
      "secondaryColor": "#hexcolor",
      "backgroundColor": "#hexcolor",
      "textTheme": "lightTheme" | "darkTheme",
      "fontFamily": "Roboto" | "custom font"
    },
    "layout": {
      "type": "scaffold" | "custom",
      "appBar": { "title": "string", "elevation": number },
      "body": { "type": "column" | "row" | "stack", "mainAxis": "string", "crossAxis": "string" },
      "floatingActionButton": { "present": boolean, "icon": "string", "position": "string" }
    },
    "screens": [
      {
        "name": "screen_name",
        "route": "/route",
        "widgets": [
          {
            "type": "Widget_Type",
            "properties": { "key": "value" },
            "children": []
          }
        ],
        "navigation": {
          "type": "push" | "replace" | "dialog",
          "target": "screen_name"
        }
      }
    ]
  },
  "explanation": "Brief explanation of design decisions",
  "accessibility": ["List of accessibility features implemented"],
  "responsive": ["List of responsive design considerations"],
  "nextSteps": ["Suggested next actions for development"]
}`

export class DesignAgent extends BaseAgent {
  constructor() {
    super('design-agent', {
      canGenerateCode: false,
      canAnalyzeDesign: true,
      canRunTests: false,
      canOptimize: true,
      canDeploy: false
    }, DESIGN_SYSTEM_PROMPT)
  }

  async processMessage(message: AgentMessage): Promise<AgentResult> {
    try {
      const { payload } = message
      const context = payload.context as AgentContext

      let prompt = ''

      switch (payload.action) {
        case 'create_design':
          prompt = this.buildDesignPrompt(payload.requirements)
          break
        case 'optimize_design':
          prompt = this.buildOptimizationPrompt(payload.currentDesign, payload.feedback)
          break
        case 'analyze_accessibility':
          prompt = this.buildAccessibilityPrompt(payload.design)
          break
        default:
          throw new Error(`Unknown action: ${payload.action}`)
      }

      const result = await this.callGemini(prompt, context)
      return this.validateResult(result)

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Design generation failed',
        confidence: 0
      }
    }
  }

  private buildDesignPrompt(requirements: any): string {
    return `Create a Flutter app design based on these requirements:

App Type: ${requirements.appType || 'mobile'}
Target Platform: ${requirements.platform || 'iOS and Android'}
User Requirements: ${requirements.description}

Key Features Needed:
${requirements.features?.map((feature: string) => `- ${feature}`).join('\n') || '- Basic functionality'}

Design Preferences:
- Color Scheme: ${requirements.colorScheme || 'modern and accessible'}
- Style: ${requirements.style || 'Material Design 3'}
- User Experience: ${requirements.userExperience || 'intuitive and user-friendly'}

Please create a comprehensive design specification that includes:
1. Complete theme configuration
2. Screen layouts and navigation flow
3. Widget hierarchy and properties
4. Accessibility considerations
5. Responsive design elements

Focus on creating a modern, accessible, and user-friendly design that follows Flutter best practices.`
  }

  private buildOptimizationPrompt(currentDesign: any, feedback: string): string {
    return `Optimize this existing Flutter design based on feedback:

CURRENT DESIGN:
${JSON.stringify(currentDesign, null, 2)}

USER FEEDBACK:
${feedback}

Please provide an improved design that addresses the feedback while maintaining:
- Visual consistency
- Accessibility standards
- Performance optimization
- Flutter best practices

Include specific explanations for each change made.`
  }

  private buildAccessibilityPrompt(design: any): string {
    return `Analyze this Flutter design for accessibility compliance:

DESIGN SPECIFICATION:
${JSON.stringify(design, null, 2)}

Provide detailed accessibility analysis including:
1. WCAG 2.1 compliance assessment
2. Color contrast ratios
3. Text sizing and readability
4. Navigation accessibility
5. Screen reader compatibility
6. Touch target sizes
7. Recommended improvements

Format the response as a structured accessibility report.`
  }
}