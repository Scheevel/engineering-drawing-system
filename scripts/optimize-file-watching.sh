#!/bin/bash
# File Watching Optimization for Docker Development
# This script optimizes file watching for Docker volumes to improve HMR performance

set -e

echo "🔧 Optimizing file watching for Docker development..."

# Check if running on Linux
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "📱 Linux detected - configuring inotify limits..."

    # Check current limits
    echo "Current inotify limits:"
    echo "  max_user_watches: $(cat /proc/sys/fs/inotify/max_user_watches)"
    echo "  max_user_instances: $(cat /proc/sys/fs/inotify/max_user_instances)"

    # Set optimal limits for development
    echo "Setting optimal inotify limits for Docker development..."

    # Temporarily increase limits
    sudo sysctl fs.inotify.max_user_watches=524288
    sudo sysctl fs.inotify.max_user_instances=256

    # Make changes persistent across reboots
    echo "Making changes persistent..."
    echo 'fs.inotify.max_user_watches=524288' | sudo tee -a /etc/sysctl.conf
    echo 'fs.inotify.max_user_instances=256' | sudo tee -a /etc/sysctl.conf

    echo "✅ File watching optimized for Linux Docker development"

elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "🍎 macOS detected - file watching should work out of the box"
    echo "   Docker Desktop for macOS handles file watching automatically"
    echo "✅ No additional configuration needed"

elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "🪟 Windows detected - using WSL2 is recommended"
    echo "   If using WSL2, run this script within the WSL2 environment"
    echo "   If using Docker Desktop, file watching should work automatically"
    echo "✅ Check Docker Desktop WSL2 integration"

else
    echo "❓ Unknown OS type: $OSTYPE"
    echo "   Manual configuration may be required"
fi

echo ""
echo "📊 File watching optimization complete!"
echo "   Restart Docker containers to apply changes:"
echo "   docker-compose -f docker-compose.dev.yml down"
echo "   docker-compose -f docker-compose.dev.yml up"