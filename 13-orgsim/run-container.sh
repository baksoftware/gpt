#!/bin/bash

# Script to build and run the orgsim container with Podman

IMAGE_NAME="orgsim-app"
CONTAINER_NAME="orgsim-container"
PORT="3000"

echo "Building the container image..."
podman build -t $IMAGE_NAME .

if [ $? -eq 0 ]; then
    echo "Build successful!"
    
    # Stop and remove existing container if it exists
    podman stop $CONTAINER_NAME 2>/dev/null
    podman rm $CONTAINER_NAME 2>/dev/null
    
    echo "Starting the container on port $PORT..."
    podman run -d \
        --name $CONTAINER_NAME \
        -p $PORT:80 \
        $IMAGE_NAME
    
    if [ $? -eq 0 ]; then
        echo "Container started successfully!"
        echo "Access the application at: http://localhost:$PORT"
        echo ""
        echo "To view logs: podman logs $CONTAINER_NAME"
        echo "To stop container: podman stop $CONTAINER_NAME"
        echo "To remove container: podman rm $CONTAINER_NAME"
    else
        echo "Failed to start container"
        exit 1
    fi
else
    echo "Build failed"
    exit 1
fi 