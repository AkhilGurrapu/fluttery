#!/bin/bash

set -e

echo "🚀 Setting up Fluttery - AI Flutter App Builder"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    echo "Checking prerequisites..."

    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or later."
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm."
        exit 1
    fi

    if ! command -v flutter &> /dev/null; then
        print_warning "Flutter is not installed. Some features will be limited."
        echo "Install Flutter from: https://docs.flutter.dev/get-started/install"
    else
        print_status "Flutter is installed: $(flutter --version | head -n1)"
    fi

    print_status "Node.js version: $(node --version)"
    print_status "npm version: $(npm --version)"
}

# Install dependencies
install_dependencies() {
    echo ""
    echo "Installing dependencies..."

    # Install root dependencies
    print_info "Installing root dependencies..."
    npm install

    # Install client dependencies
    print_info "Installing client dependencies..."
    cd client
    npm install
    cd ..

    # Install server dependencies
    print_info "Installing server dependencies..."
    cd server
    npm install
    cd ..

    print_status "All dependencies installed successfully"
}

# Setup environment files
setup_environment() {
    echo ""
    echo "Setting up environment files..."

    # Server environment
    if [ ! -f "server/.env" ]; then
        cp server/.env.example server/.env
        print_status "Created server/.env from template"
        print_warning "Please update server/.env with your actual configuration"
    else
        print_info "server/.env already exists"
    fi

    # Client environment
    if [ ! -f "client/.env.local" ]; then
        cp client/.env.local.example client/.env.local
        print_status "Created client/.env.local from template"
        print_warning "Please update client/.env.local with your actual configuration"
    else
        print_info "client/.env.local already exists"
    fi
}

# Setup directories
setup_directories() {
    echo ""
    echo "Setting up project directories..."

    mkdir -p server/temp/projects
    mkdir -p server/temp/preview
    mkdir -p server/logs
    mkdir -p server/preview
    mkdir -p server/uploads

    print_status "Project directories created"
}

# Build TypeScript
build_typescript() {
    echo ""
    echo "Building TypeScript..."

    cd server
    npm run build
    cd ..

    print_status "TypeScript build completed"
}

# Setup git hooks (optional)
setup_git() {
    echo ""
    echo "Setting up Git configuration..."

    if [ -d ".git" ]; then
        print_info "Git repository detected"

        # Create .gitignore if it doesn't exist
        if [ ! -f ".gitignore" ]; then
            cat > .gitignore << EOL
# Dependencies
node_modules/
*/node_modules/

# Build outputs
dist/
build/
.next/

# Environment files
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Temporary files
temp/
tmp/
*.tmp

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# Flutter/Dart
.dart_tool/
.packages
.pub-cache/
.pub/
build/
preview/

# Firebase
.firebase/
firebase-debug.log
.runtimeconfig.json
EOL
            print_status "Created .gitignore file"
        fi
    else
        print_info "Not a git repository, skipping git setup"
    fi
}

# Display final instructions
show_final_instructions() {
    echo ""
    echo "🎉 Setup completed successfully!"
    echo "==============================="
    echo ""
    echo "Next steps:"
    echo ""
    echo "1. Configure your environment variables:"
    echo "   - Edit server/.env with your Google Gemini API key"
    echo "   - Edit client/.env.local with your API URL"
    echo ""
    echo "2. Optional: Set up Firebase integration:"
    echo "   - Create a Firebase project"
    echo "   - Add your Firebase configuration to .env files"
    echo ""
    echo "3. Start the development servers:"
    echo "   ${GREEN}npm run dev${NC}"
    echo ""
    echo "4. Open your browser and visit:"
    echo "   ${BLUE}http://localhost:3000${NC}"
    echo ""
    echo "Available commands:"
    echo "  ${YELLOW}npm run dev${NC}          - Start development servers"
    echo "  ${YELLOW}npm run build${NC}        - Build for production"
    echo "  ${YELLOW}npm run start${NC}        - Start production servers"
    echo "  ${YELLOW}npm run client:dev${NC}   - Start only the client"
    echo "  ${YELLOW}npm run server:dev${NC}   - Start only the server"
    echo ""
    echo "For more information, see README.md"
    echo ""
    print_status "Happy coding with Fluttery! 🦋"
}

# Main execution
main() {
    check_prerequisites
    install_dependencies
    setup_environment
    setup_directories

    # Only build if not in CI environment
    if [ "$CI" != "true" ]; then
        build_typescript
    fi

    setup_git
    show_final_instructions
}

# Handle script arguments
case "$1" in
    "--help"|"-h")
        echo "Fluttery Setup Script"
        echo ""
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --skip-deps         Skip dependency installation"
        echo "  --skip-build        Skip TypeScript build"
        echo "  --docker            Setup for Docker environment"
        echo ""
        exit 0
        ;;
    "--skip-deps")
        SKIP_DEPS=true
        ;;
    "--skip-build")
        SKIP_BUILD=true
        ;;
    "--docker")
        DOCKER_SETUP=true
        ;;
esac

# Run main function
main