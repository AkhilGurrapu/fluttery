# Fluttery Setup Guide

## 🚀 Getting Started with Fluttery

This guide will help you set up the Fluttery multi-agent Flutter app builder with proper Google Gemini API integration.

## ✅ Prerequisites

1. **Node.js** (v18 or higher)
2. **Flutter SDK** (latest stable version)
3. **Google Gemini API Key** (required for AI features)

## 🔧 Quick Setup

### 1. Install Dependencies

```bash
# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install
```

### 2. Configure Google Gemini API

#### Get Your API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key (should start with `AIza...`)

#### Configure Environment
1. Copy the example environment file:
   ```bash
   cp server/.env.example server/.env
   ```

2. Edit `server/.env` and replace the placeholder API key:
   ```bash
   # Replace this placeholder key
   GEMINI_API_KEY=AAIzaSyBhfpEltvhEoRQCVNWpOO0VPX_Kru8ehJs

   # With your actual key
   GEMINI_API_KEY=AIzaSyC_your_actual_api_key_here
   ```

#### Test API Integration
Run the test script to verify your API key:
```bash
cd server
node test-gemini-api.js
```

You should see: `✅ API Connection Successful!`

### 3. Start Development Servers

```bash
# Terminal 1 - Start the backend
npm run server:dev

# Terminal 2 - Start the frontend
npm run client:dev

# Terminal 3 - Start Flutter preview (optional)
cd flutter_preview && flutter run -d web-server --web-port 8080
```

## 🌐 Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **Flutter Preview**: http://localhost:8080

## 🧪 Testing the Platform

1. Open http://localhost:3000 in your browser
2. In the chat interface, try entering:
   - "Create a simple counter app with increment and decrement buttons"
   - "Build a todo app with Firebase authentication"
   - "Make a weather app with location services"

3. The AI should generate Flutter code and display a live preview

## 🔍 Troubleshooting

### Common Issues

#### 1. "403 Permission Denied" Error
- **Problem**: Invalid or missing Gemini API key
- **Solution**: Follow the API key setup steps above
- **Test**: Run `node test-gemini-api.js` to verify

#### 2. "Session Creation Timeout"
- **Problem**: Port conflicts or Flutter SDK issues
- **Solution**:
  ```bash
  # Kill existing processes
  lsof -ti:8080,8081,8082 | xargs -r kill -9

  # Restart servers
  npm run dev
  ```

#### 3. "Flutter Command Not Found"
- **Problem**: Flutter SDK not in PATH
- **Solution**: Install Flutter and add to PATH
  ```bash
  export PATH="$PATH:/usr/local/flutter/bin"
  ```

#### 4. Dependencies Installation Fails
- **Problem**: Node version compatibility
- **Solution**: Use Node.js v18 or higher
  ```bash
  node --version  # Should be v18+
  npm cache clean --force
  rm -rf node_modules package-lock.json
  npm install
  ```

### Debug Commands

```bash
# Check running processes on Fluttery ports
lsof -i :3000 -i :8001 -i :8080 -i :8081 -i :8082

# Kill all Flutter processes
pkill -f "flutter run"

# Check server logs
cd server && npm run dev

# Test API endpoint directly
curl -X POST http://localhost:8001/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"initialPrompt": "Create a hello world app"}'
```

## 🚀 Production Deployment

### Environment Variables for Production

```bash
NODE_ENV=production
PORT=8001
CLIENT_URL=https://your-domain.com
GEMINI_API_KEY=your_production_api_key
FIREBASE_PROJECT_ID=your_firebase_project
LOG_LEVEL=warn
```

### Docker Setup (Optional)

```dockerfile
# Dockerfile example for server
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .
EXPOSE 8001
CMD ["npm", "start"]
```

## 📚 Architecture Overview

### Multi-Agent System
- **MasterOrchestratorAgent**: Coordinates all agents using ReWOO pattern
- **DesignAgent**: Handles UI/UX design decisions
- **CodeAgent**: Generates optimized Flutter code
- **TestingAgent**: Ensures code quality and testing

### Session Management
- Each user gets an isolated Flutter project
- Dedicated port allocation (8080+)
- Hot reload support for live updates
- Automatic cleanup of inactive sessions

### Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, Socket.IO
- **Backend**: Node.js, Express, TypeScript, Winston logging
- **AI**: Google Gemini 2.0 Flash Experimental
- **Mobile**: Flutter 3.x with web support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

## 🆘 Support

If you encounter issues:

1. Check this setup guide
2. Run the diagnostic commands above
3. Review server logs for errors
4. Test API integration with `test-gemini-api.js`
5. Create an issue on GitHub with detailed error logs

---

**Made with ❤️ by DataSarva AI Development Division**