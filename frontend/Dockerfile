# frontend/Dockerfile
FROM node:20-alpine

# Set work directory
WORKDIR /app/

# Install dependencies
COPY package.json package-lock.json /app/
RUN npm install

# Copy project files
COPY . .

# Expose port
EXPOSE 3000

# Start Next.js
CMD ["npm", "run", "build"]
