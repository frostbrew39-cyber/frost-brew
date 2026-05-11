# Use Node.js 20+
FROM node:20-slim

WORKDIR /app

# Copy root package.json and lockfile for workspace resolution
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared-types/package*.json ./packages/shared-types/

# Install dependencies (only for the API and shared-types)
RUN npm install -w @frost-brew/api

# Copy the rest of the code
COPY . .

# Build the API (shared-types is consumed from source via workspace paths)
RUN npm run build -w @frost-brew/api

WORKDIR /app/apps/api

# Expose port
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
