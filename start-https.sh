#!/bin/bash

# Start Next.js development server with HTTPS for camera testing
# This allows camera access in modern browsers

echo "Starting Next.js with HTTPS for camera testing..."
echo "Access your app at: https://localhost:3000"
echo "Note: You may need to accept the self-signed certificate"

# Create a self-signed certificate if it doesn't exist
if [ ! -f "localhost.pem" ] || [ ! -f "localhost-key.pem" ]; then
    echo "Creating self-signed certificate..."
    openssl req -x509 -out localhost.pem -keyout localhost-key.pem -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' -extensions EXT -config <(printf "[dn]\nCN=localhost\n[req]\ndistinguished_name = dn\n[EXT]\nsubjectAltName=DNS:localhost\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth")
fi

# Start Next.js with HTTPS
HTTPS=true SSL_CRT_FILE=localhost.pem SSL_KEY_FILE=localhost-key.pem npm run dev
