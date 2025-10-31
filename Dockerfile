# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for build)
# Use --ignore-scripts to prevent postinstall from running before code is copied
RUN npm ci --ignore-scripts

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Remove devDependencies after build to reduce image size
RUN npm prune --production

# Expose the port the app runs on (default 10000, can be overridden by PORT env var)
EXPOSE 10000

# Define the command to run the application
CMD ["npm", "start"]