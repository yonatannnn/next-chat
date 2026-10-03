# Use official Node.js 20 image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source code
COPY . .

# Build Next.js app
RUN npm run build

# Remove devDependencies to reduce image size
RUN npm prune --production

# Expose the Next.js port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
