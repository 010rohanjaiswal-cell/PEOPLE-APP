#!/bin/bash

# Script to start Expo dev client with proper connection settings

echo "Starting Expo dev client..."
echo ""
echo "Choose connection method:"
echo "1. Tunnel (recommended - works through firewalls)"
echo "2. LAN (faster - requires same WiFi)"
echo "3. USB (device connected via USB cable)"
echo ""
read -p "Enter choice (1-3): " choice

case $choice in
  1)
    echo "Starting with tunnel mode..."
    npx expo start --dev-client --tunnel --clear
    ;;
  2)
    echo "Starting with LAN mode..."
    npx expo start --dev-client --lan --clear
    ;;
  3)
    echo "Setting up USB connection..."
    adb reverse tcp:8081 tcp:8081
    echo "Starting dev server..."
    npx expo start --dev-client --clear
    ;;
  *)
    echo "Invalid choice. Using tunnel mode (default)..."
    npx expo start --dev-client --tunnel --clear
    ;;
esac

