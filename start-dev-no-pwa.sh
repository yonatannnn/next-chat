#!/bin/bash

# Start development server without PWA to avoid workbox watch mode issues
echo "Starting development server without PWA..."
echo "This will prevent the 'GenerateSW has been called multiple times' warnings"

# Set environment variable to disable PWA
export DISABLE_PWA=true

# Start the development server
npm run dev
