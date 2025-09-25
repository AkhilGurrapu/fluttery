FROM node:18-alpine

# Install Flutter dependencies
RUN apk add --no-cache \
    bash \
    curl \
    git \
    unzip \
    xz \
    zip \
    libstdc++ \
    ca-certificates

# Install Flutter
ENV FLUTTER_HOME="/opt/flutter"
ENV PATH="$FLUTTER_HOME/bin:$PATH"

RUN git clone https://github.com/flutter/flutter.git $FLUTTER_HOME -b stable --depth 1
RUN flutter doctor --android-licenses || true
RUN flutter config --enable-web
RUN flutter doctor

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p temp/projects temp/preview logs preview

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["npm", "start"]