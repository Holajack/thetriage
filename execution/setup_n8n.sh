#!/bin/bash
# HikeWise Agent Swarm - n8n Setup Script
#
# This script sets up n8n for the HikeWise swarm automation.
#
# Usage:
#   ./execution/setup_n8n.sh [start|stop|restart|status|logs|generate-workflows]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.n8n.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker Desktop first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker Desktop."
        exit 1
    fi

    log_info "Docker is running"
}

generate_workflows() {
    log_info "Generating n8n workflow files..."
    cd "$PROJECT_DIR"
    python3 execution/n8n_workflow_generator.py --action generate-all
    log_info "Workflows generated in $PROJECT_DIR/n8n-workflows/"
}

start_n8n() {
    check_docker

    log_info "Starting n8n container..."
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" up -d

    log_info "Waiting for n8n to be ready..."
    sleep 5

    # Wait for health check
    for i in {1..30}; do
        if curl -s http://localhost:5678/healthz > /dev/null 2>&1; then
            log_info "n8n is ready!"
            break
        fi
        sleep 1
    done

    echo ""
    log_info "n8n is running at: http://localhost:5678"
    log_info "Default credentials: admin / hikewise123"
    echo ""
    log_info "To import workflows:"
    echo "  1. Open http://localhost:5678"
    echo "  2. Go to Workflows > Import from File"
    echo "  3. Import JSON files from: $PROJECT_DIR/n8n-workflows/"
}

stop_n8n() {
    log_info "Stopping n8n container..."
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" down
    log_info "n8n stopped"
}

restart_n8n() {
    stop_n8n
    start_n8n
}

show_status() {
    check_docker

    if docker ps | grep -q hikewise-n8n; then
        log_info "n8n is running"
        docker ps --filter name=hikewise-n8n --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        log_warn "n8n is not running"
    fi
}

show_logs() {
    check_docker
    docker logs -f hikewise-n8n
}

show_help() {
    echo "HikeWise Agent Swarm - n8n Setup"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  start              Start n8n container"
    echo "  stop               Stop n8n container"
    echo "  restart            Restart n8n container"
    echo "  status             Show n8n status"
    echo "  logs               Show n8n logs (follow)"
    echo "  generate-workflows Generate workflow JSON files"
    echo "  help               Show this help"
    echo ""
    echo "Access n8n at: http://localhost:5678"
    echo "Default credentials: admin / hikewise123"
}

# Main
case "${1:-help}" in
    start)
        start_n8n
        ;;
    stop)
        stop_n8n
        ;;
    restart)
        restart_n8n
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    generate-workflows)
        generate_workflows
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
