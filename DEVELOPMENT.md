# Fluttery Development Guide

## Overview

Fluttery is a web-based AI-powered Flutter app builder that converts plain English descriptions into fully functional Flutter mobile applications. This guide covers the development setup, architecture, and contribution guidelines.

## Architecture

```
Fluttery/
├── client/              # Next.js React frontend
│   ├── app/            # Next.js 13+ app directory
│   ├── components/     # React components
│   └── styles/         # CSS and styling
├── server/             # Node.js Express backend
│   ├── src/
│   │   ├── routes/     # API routes
│   │   ├── services/   # Business logic services
│   │   ├── middleware/ # Express middleware
│   │   └── utils/      # Utility functions
├── flutter-engine/     # Flutter code generation
└── firebase/           # Firebase configuration
```

## Technology Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Monaco Editor** - VS Code-like code editor
- **Socket.IO Client** - Real-time communication

### Backend
- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **TypeScript** - Type-safe JavaScript
- **OpenAI API** - AI code generation
- **Socket.IO** - Real-time communication
- **Winston** - Logging
- **Joi** - Input validation

### Flutter Engine
- **Flutter SDK** - Mobile app development
- **Dart** - Programming language
- **Firebase** - Backend services
- **Web compilation** - Flutter for web preview

## Development Setup

### Prerequisites

1. **Node.js 18+**
   ```bash
   node --version  # Should be 18.0.0 or later
   ```

2. **Flutter SDK** (optional for full functionality)
   ```bash
   flutter --version
   flutter config --enable-web
   ```

3. **OpenAI API Key**
   - Get from: https://platform.openai.com/api-keys

### Quick Start

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd fluttery
   ./setup.sh
   ```

2. **Configure environment:**
   ```bash
   # Edit server/.env
   OPENAI_API_KEY=your_openai_key_here

   # Edit client/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

4. **Visit:** http://localhost:3000

### Manual Setup

If you prefer manual setup:

```bash
# Install dependencies
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..

# Setup environment files
cp server/.env.example server/.env
cp client/.env.local.example client/.env.local

# Build server
cd server && npm run build && cd ..

# Start development servers
npm run dev
```

## Development Workflow

### Running Services

```bash
# All services (recommended)
npm run dev

# Individual services
npm run client:dev    # Frontend only
npm run server:dev    # Backend only
```

### Code Quality

```bash
# Linting
cd client && npm run lint
cd server && npm run lint

# Type checking
cd client && npx tsc --noEmit
cd server && npm run build
```

### Testing

```bash
# Run tests
cd server && npm test
cd client && npm test

# Watch mode
cd server && npm run test:watch
```

## API Endpoints

### Code Generation
- `POST /api/generate` - Generate Flutter code from prompt
- `POST /api/generate/improve` - Improve existing code
- `POST /api/generate/explain` - Explain code functionality

### Preview System
- `POST /api/preview` - Generate app preview
- `PUT /api/preview/project` - Update project
- `DELETE /api/preview/project/:id` - Delete project

### Export
- `POST /api/export` - Export Flutter project
- `GET /api/export/templates` - Get export templates

## Core Services

### AI Service (`server/src/services/aiService.ts`)
Handles OpenAI integration for code generation:

```typescript
import { aiService } from './services/aiService'

const result = await aiService.generateFlutterCode({
  prompt: "Create a todo app",
  currentCode: existingCode,
  projectContext: { firebase: true }
})
```

### Flutter Engine (`server/src/services/flutterEngine.ts`)
Manages Flutter project creation and compilation:

```typescript
import { flutterEngine } from './services/flutterEngine'

const project = await flutterEngine.createProject(
  'MyApp',
  dartCode,
  ['http', 'provider'],
  true // Firebase
)

const previewUrl = await flutterEngine.generatePreview(dartCode)
```

### Firebase Service (`server/src/services/firebaseService.ts`)
Handles Firebase integration and code generation:

```typescript
import { firebaseService } from './services/firebaseService'

const authCode = firebaseService.generateFirebaseAuthCode(true, false)
const firestoreCode = firebaseService.generateFirestoreCode('todos')
```

## Frontend Components

### Main Interface (`client/app/page.tsx`)
- Code editor with syntax highlighting
- Real-time mobile preview
- Prompt input for AI generation
- Project management

### Code Editor (`client/components/CodeEditor.tsx`)
- Monaco editor with Dart/Flutter support
- Custom theme and syntax highlighting
- Copy functionality

### Mobile Preview (`client/components/MobilePreview.tsx`)
- iPhone-like preview frame
- Real-time Flutter web compilation
- Error handling and loading states

## Environment Variables

### Server (`.env`)
```bash
NODE_ENV=development
PORT=8000
CLIENT_URL=http://localhost:3000
OPENAI_API_KEY=your_openai_key
FIREBASE_PROJECT_ID=your_project_id
LOG_LEVEL=info
```

### Client (`.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

## Deployment

### Docker
```bash
# Build and run
docker-compose up --build

# Production
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment
```bash
# Build
npm run build

# Start production
npm start
```

## Contributing

### Code Style
- Use TypeScript for type safety
- Follow ESLint configurations
- Use Prettier for formatting
- Write meaningful commit messages

### Pull Request Process
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Update documentation
6. Submit pull request

### Testing Guidelines
- Write unit tests for services
- Test API endpoints
- Verify UI components work correctly
- Ensure Flutter code generation is accurate

## Troubleshooting

### Common Issues

**1. Flutter not found**
```bash
# Install Flutter
git clone https://github.com/flutter/flutter.git
export PATH="$PATH:`pwd`/flutter/bin"
flutter config --enable-web
```

**2. OpenAI API errors**
- Check API key is valid
- Ensure sufficient credits
- Verify rate limits

**3. Preview not loading**
- Check Flutter SDK installation
- Verify web support is enabled
- Check server logs for errors

**4. Port conflicts**
```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill -9
lsof -ti:8000 | xargs kill -9
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug

# Client debug mode
NEXT_PUBLIC_DEBUG_MODE=true npm run dev
```

## Project Structure Details

### Client Structure
```
client/
├── app/
│   ├── globals.css         # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/
│   ├── CodeEditor.tsx     # Monaco editor wrapper
│   ├── MobilePreview.tsx  # Flutter app preview
│   ├── PromptInput.tsx    # AI prompt interface
│   └── ProjectPanel.tsx   # Project management
├── lib/
│   └── utils.ts           # Client utilities
└── types/
    └── index.ts           # TypeScript types
```

### Server Structure
```
server/src/
├── routes/
│   ├── api.ts            # General API routes
│   ├── generate.ts       # AI code generation
│   ├── preview.ts        # Preview management
│   └── export.ts         # Project export
├── services/
│   ├── aiService.ts      # OpenAI integration
│   ├── flutterEngine.ts  # Flutter compilation
│   └── firebaseService.ts # Firebase integration
├── middleware/
│   ├── errorHandler.ts   # Error handling
│   └── rateLimiter.ts    # Rate limiting
├── utils/
│   └── logger.ts         # Logging utility
└── index.ts              # Server entry point
```

## Performance Optimization

### Client Optimization
- Code splitting with Next.js
- Lazy loading components
- Monaco editor web workers
- Optimized bundle size

### Server Optimization
- Rate limiting
- Request caching
- Background processing
- Memory management

### Flutter Compilation
- Incremental compilation
- Web-optimized builds
- Asset optimization
- Hot reload support

## Security Considerations

- Input validation with Joi
- Rate limiting per IP
- Secure headers with Helmet
- Environment variable validation
- Firebase security rules
- CORS configuration

## Monitoring and Logging

### Logging Levels
- `error` - Critical errors
- `warn` - Warning messages
- `info` - General information
- `debug` - Debug information

### Log Files
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- `logs/exceptions.log` - Uncaught exceptions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

- GitHub Issues: Report bugs and feature requests
- Documentation: Check README.md and this guide
- Community: Join our Discord/Slack for discussions

---

For more information, visit the [official repository](https://github.com/your-org/fluttery).