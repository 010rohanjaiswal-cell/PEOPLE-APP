#!/bin/bash
# Script to set up Java for React Native/Expo development

echo "Checking Java installation..."

# Check if Java 17+ is available
JAVA_17_HOME=$(/usr/libexec/java_home -v 17 2>/dev/null)
JAVA_21_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null)
JAVA_11_HOME=$(/usr/libexec/java_home -v 11 2>/dev/null)

if [ -n "$JAVA_17_HOME" ]; then
    echo "✅ Java 17 found at: $JAVA_17_HOME"
    export JAVA_HOME="$JAVA_17_HOME"
    echo "JAVA_HOME set to: $JAVA_HOME"
elif [ -n "$JAVA_21_HOME" ]; then
    echo "✅ Java 21 found at: $JAVA_21_HOME"
    export JAVA_HOME="$JAVA_21_HOME"
    echo "JAVA_HOME set to: $JAVA_HOME"
elif [ -n "$JAVA_11_HOME" ]; then
    echo "✅ Java 11 found at: $JAVA_11_HOME"
    export JAVA_HOME="$JAVA_11_HOME"
    echo "JAVA_HOME set to: $JAVA_HOME"
else
    echo "❌ Java 11, 17, or 21 not found!"
    echo ""
    echo "Please install Java 17 (recommended) or Java 21:"
    echo "  brew install --cask temurin@17"
    echo ""
    echo "Or download from: https://adoptium.net/temurin/releases/?version=17"
    exit 1
fi

# Verify Java version
echo ""
echo "Java version:"
java -version

echo ""
echo "JAVA_HOME: $JAVA_HOME"
echo ""
echo "✅ Java setup complete! You can now run: npx expo run:android"

