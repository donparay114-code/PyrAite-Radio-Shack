#!/bin/bash
# wait-for-it.sh - Wait for a service to be available
# Usage: ./wait-for-it.sh host:port [-t timeout] [-- command args]

set -e

TIMEOUT=30
QUIET=0
HOST=""
PORT=""
CMD=""

usage() {
    echo "Usage: $0 host:port [-t timeout] [-q] [-- command args]"
    echo ""
    echo "Options:"
    echo "  -t TIMEOUT   Timeout in seconds (default: 30)"
    echo "  -q           Quiet mode"
    echo "  -- COMMAND   Execute command after service is available"
    exit 1
}

wait_for() {
    if [ $QUIET -eq 0 ]; then
        echo "Waiting for $HOST:$PORT..."
    fi

    for i in $(seq $TIMEOUT); do
        if nc -z "$HOST" "$PORT" > /dev/null 2>&1; then
            if [ $QUIET -eq 0 ]; then
                echo "$HOST:$PORT is available"
            fi
            return 0
        fi
        sleep 1
    done

    echo "Timeout waiting for $HOST:$PORT after $TIMEOUT seconds"
    return 1
}

# Parse arguments
while [ $# -gt 0 ]; do
    case "$1" in
        *:* )
            HOST=$(echo "$1" | cut -d: -f1)
            PORT=$(echo "$1" | cut -d: -f2)
            shift
            ;;
        -t)
            TIMEOUT="$2"
            shift 2
            ;;
        -q)
            QUIET=1
            shift
            ;;
        --)
            shift
            CMD="$@"
            break
            ;;
        *)
            usage
            ;;
    esac
done

if [ -z "$HOST" ] || [ -z "$PORT" ]; then
    usage
fi

wait_for

if [ -n "$CMD" ]; then
    exec $CMD
fi
