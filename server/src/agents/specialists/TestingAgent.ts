import { BaseAgent, AgentResult } from '../shared/BaseAgent'
import { AgentMessage, AgentContext } from '../shared/AgentCommunication'

const TESTING_SYSTEM_PROMPT = `You are a Flutter Testing and Quality Assurance Agent. Your expertise includes:

- Flutter testing frameworks (flutter_test, integration_test)
- Unit testing with mockito and test doubles
- Widget testing for UI components
- Integration testing for complete workflows
- Performance testing and profiling
- Code quality analysis and linting
- Test-driven development (TDD) practices
- Accessibility testing
- Cross-platform testing strategies

RESPONSE FORMAT:
Always respond with a JSON object containing:
{
  "testSuite": {
    "unitTests": [
      {
        "file": "test/unit/feature_test.dart",
        "content": "// Complete test code",
        "description": "What this test covers",
        "coverage": ["list", "of", "tested", "methods"]
      }
    ],
    "widgetTests": [
      {
        "file": "test/widget/screen_test.dart",
        "content": "// Complete widget test code",
        "description": "UI components being tested",
        "interactions": ["tap", "scroll", "input"]
      }
    ],
    "integrationTests": [
      {
        "file": "integration_test/app_test.dart",
        "content": "// Complete integration test code",
        "description": "End-to-end workflow being tested",
        "scenarios": ["happy path", "error cases"]
      }
    ]
  },
  "testConfiguration": {
    "dependencies": [
      {
        "name": "flutter_test",
        "version": "sdk: flutter",
        "type": "dev_dependencies"
      }
    ],
    "testCommands": [
      "flutter test",
      "flutter test --coverage"
    ],
    "cicd": {
      "githubActions": "# GitHub Actions workflow for testing",
      "testStrategy": "Description of testing strategy"
    }
  },
  "qualityMetrics": {
    "expectedCoverage": 80,
    "performanceBenchmarks": [
      {
        "metric": "App startup time",
        "target": "< 2 seconds",
        "test": "Performance test description"
      }
    ],
    "accessibilityChecks": [
      "Screen reader compatibility",
      "Color contrast validation",
      "Touch target sizes"
    ]
  },
  "recommendations": [
    "Testing best practices and improvements"
  ],
  "explanation": "Overall testing strategy and approach"
}`

export class TestingAgent extends BaseAgent {
  constructor() {
    super('testing-agent', {
      canGenerateCode: true,
      canAnalyzeDesign: false,
      canRunTests: true,
      canOptimize: true,
      canDeploy: false
    }, TESTING_SYSTEM_PROMPT)
  }

  async processMessage(message: AgentMessage): Promise<AgentResult> {
    try {
      const { payload } = message
      const context = payload.context as AgentContext

      let prompt = ''

      switch (payload.action) {
        case 'generate_tests':
          prompt = this.buildTestGenerationPrompt(payload.codebase, payload.testRequirements)
          break
        case 'analyze_quality':
          prompt = this.buildQualityAnalysisPrompt(payload.codebase)
          break
        case 'performance_tests':
          prompt = this.buildPerformanceTestPrompt(payload.codebase, payload.performanceTargets)
          break
        case 'accessibility_tests':
          prompt = this.buildAccessibilityTestPrompt(payload.codebase)
          break
        default:
          throw new Error(`Unknown action: ${payload.action}`)
      }

      const result = await this.callGemini(prompt, context)
      return this.validateResult(result)

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test generation failed',
        confidence: 0
      }
    }
  }

  private buildTestGenerationPrompt(codebase: any, testRequirements: any): string {
    return `Generate comprehensive Flutter tests for this codebase:

CODEBASE:
${JSON.stringify(codebase, null, 2)}

TEST REQUIREMENTS:
- Coverage Target: ${testRequirements.coverage || '80%'}
- Test Types: ${testRequirements.types?.join(', ') || 'unit, widget, integration'}
- Performance Testing: ${testRequirements.performance || 'Basic benchmarks'}
- Accessibility Testing: ${testRequirements.accessibility || 'WCAG compliance'}
- Error Scenarios: ${testRequirements.errorScenarios || 'Common error cases'}

Generate a complete test suite that includes:

1. UNIT TESTS:
   - Test all business logic and data models
   - Mock external dependencies
   - Cover edge cases and error scenarios
   - Test state management logic

2. WIDGET TESTS:
   - Test all custom widgets and screens
   - Verify UI rendering and interactions
   - Test responsive behavior
   - Validate accessibility features

3. INTEGRATION TESTS:
   - Test complete user workflows
   - End-to-end feature functionality
   - Navigation and state persistence
   - API integration testing

4. PERFORMANCE TESTS:
   - App startup time benchmarks
   - Memory usage validation
   - Scroll performance tests
   - Build size analysis

Ensure all tests follow Flutter testing best practices and provide good coverage of the application functionality.`
  }

  private buildQualityAnalysisPrompt(codebase: any): string {
    return `Perform comprehensive quality analysis of this Flutter codebase:

CODEBASE:
${JSON.stringify(codebase, null, 2)}

Analyze and provide feedback on:

1. CODE QUALITY:
   - Adherence to Dart/Flutter conventions
   - Code organization and architecture
   - Error handling implementation
   - Performance optimizations
   - Memory leak potential

2. MAINTAINABILITY:
   - Code readability and documentation
   - Separation of concerns
   - Reusability of components
   - Testability of code structure

3. SECURITY:
   - Input validation
   - Data sanitization
   - Secure storage practices
   - API security considerations

4. ACCESSIBILITY:
   - Screen reader support
   - Color contrast compliance
   - Touch target sizes
   - Keyboard navigation

5. PERFORMANCE:
   - Widget build optimization
   - State management efficiency
   - Asset optimization
   - Bundle size considerations

Provide specific recommendations for improvements with code examples where applicable.`
  }

  private buildPerformanceTestPrompt(codebase: any, performanceTargets: any): string {
    return `Create performance tests for this Flutter application:

CODEBASE:
${JSON.stringify(codebase, null, 2)}

PERFORMANCE TARGETS:
- App Startup Time: ${performanceTargets.startupTime || '< 2 seconds'}
- Frame Rate: ${performanceTargets.frameRate || '60 FPS'}
- Memory Usage: ${performanceTargets.memoryUsage || '< 100MB baseline'}
- Build Size: ${performanceTargets.buildSize || 'Optimized for platform'}

Generate performance tests that validate:

1. APP STARTUP PERFORMANCE:
   - Cold start time measurement
   - Warm start time measurement
   - Time to first paint
   - Time to interactive

2. RUNTIME PERFORMANCE:
   - Frame rate during animations
   - Scroll performance on lists
   - Memory usage during navigation
   - CPU usage monitoring

3. BUILD ANALYSIS:
   - Bundle size optimization
   - Asset optimization validation
   - Code splitting effectiveness

4. NETWORK PERFORMANCE:
   - API response time handling
   - Offline functionality
   - Data caching efficiency

Include benchmarking code and automated performance regression detection.`
  }

  private buildAccessibilityTestPrompt(codebase: any): string {
    return `Create comprehensive accessibility tests for this Flutter application:

CODEBASE:
${JSON.stringify(codebase, null, 2)}

Generate accessibility tests that validate:

1. SCREEN READER COMPATIBILITY:
   - Semantic labels for all interactive elements
   - Proper reading order and navigation
   - Announcements for dynamic content changes
   - Screen reader focus management

2. VISUAL ACCESSIBILITY:
   - Color contrast ratios (WCAG AA compliance)
   - Text scaling support (up to 200%)
   - High contrast mode compatibility
   - Color-blind friendly design validation

3. MOTOR ACCESSIBILITY:
   - Touch target sizes (minimum 44x44 points)
   - Keyboard navigation support
   - Switch control compatibility
   - Gesture alternative options

4. COGNITIVE ACCESSIBILITY:
   - Clear navigation patterns
   - Error message clarity
   - Timeout handling
   - Content structure validation

Include automated accessibility testing setup and manual testing checklists that ensure WCAG 2.1 AA compliance.`
  }
}