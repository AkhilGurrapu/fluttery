# Fluttery - AI Flutter App Builder

A web-based platform that converts plain English descriptions into fully functional Flutter mobile applications with real-time preview and Firebase integration.

## Features

- 🤖 AI-powered Flutter code generation using Google Gemini 2.0 Flash
- 🎨 Real-time code editing with syntax highlighting
- 📱 Live mobile app preview
- 🔥 Firebase integration (Auth, Firestore, Storage)
- 📦 One-click project export
- 🎯 Mobile-first Flutter components
- 🔄 Hot reload support

## Architecture

```
fluttery/
├── client/          # React frontend with Monaco editor
├── server/          # Node.js backend with AI integration
├── flutter-engine/  # Flutter code generation engine
└── firebase/        # Firebase configuration
```

## Getting Started

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Start development servers:
   ```bash
   npm run dev
   ```

3. Open http://localhost:3000 in your browser

## Usage

1. Describe your app in plain English (e.g., "Create a todo app with Firebase authentication")
2. Watch as the AI generates Flutter code in real-time
3. Preview your app in the mobile simulator
4. Edit the code directly or refine with more natural language
5. Export the complete Flutter project

## Environment Variables

Create `.env` files in both `client/` and `server/` directories:

**server/.env:**
```
GEMINI_API_KEY=your_gemini_api_key
FIREBASE_PROJECT_ID=your_project_id
PORT=8000
```

**client/.env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_CONFIG=your_firebase_config
```