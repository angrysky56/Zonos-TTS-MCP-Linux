FROM node:20-slim

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create log directory
RUN mkdir -p /app/logs

# Expose any necessary ports (not needed for MCP, but good practice)
EXPOSE 8080

# Command to run the compiled server
CMD ["node", "dist/server.js"]
