
#!/bin/bash

# Deployment script for Lab Management System
set -e

echo "🚀 Lab Management System Deployment Script"
echo "=========================================="

# Configuration
APP_NAME="lab-management-system"
DOCKER_IMAGE="$APP_NAME:latest"

# Functions
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker first."
        exit 1
    fi
    echo "✅ Docker is available"
}

check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    echo "✅ Docker Compose is available"
}

build_image() {
    echo "🔨 Building Docker image..."
    docker build -t $DOCKER_IMAGE .
    echo "✅ Docker image built successfully"
}

deploy_local() {
    echo "🏠 Deploying locally..."
    docker-compose up -d --build
    echo "✅ Application deployed locally"
    echo "🌐 Access your application at: http://localhost:41783"
}

deploy_production() {
    echo "🏭 Deploying to production..."
    docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
    echo "✅ Application deployed to production"
}

show_status() {
    echo "📊 Application Status:"
    docker-compose ps
    echo ""
    echo "📋 Application Logs (last 20 lines):"
    docker-compose logs --tail=20 lab-management
}

cleanup() {
    echo "🧹 Cleaning up..."
    docker-compose down
    docker system prune -f
    echo "✅ Cleanup completed"
}

# Main script
case "$1" in
    "build")
        check_docker
        build_image
        ;;
    "local")
        check_docker
        check_docker_compose
        deploy_local
        ;;
    "production")
        check_docker
        check_docker_compose
        deploy_production
        ;;
    "status")
        show_status
        ;;
    "cleanup")
        cleanup
        ;;
    *)
        echo "Usage: $0 {build|local|production|status|cleanup}"
        echo ""
        echo "Commands:"
        echo "  build      - Build Docker image"
        echo "  local      - Deploy locally for development"
        echo "  production - Deploy to production"
        echo "  status     - Show application status and logs"
        echo "  cleanup    - Stop and clean up containers"
        exit 1
        ;;
esac
