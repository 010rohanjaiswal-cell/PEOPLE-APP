#!/bin/bash

# Script to get the complete PhonePe auth token
# Usage: ./get-full-auth-token.sh

BACKEND_URL="https://freelancing-platform-backup.onrender.com"

echo "=========================================="
echo "Getting Complete PhonePe Auth Token"
echo "=========================================="
echo ""

echo "Requesting full token (with ?full=true)..."
echo ""

RESPONSE=$(curl -s -X GET "${BACKEND_URL}/api/payment/test-auth-token?full=true" \
  -H "Content-Type: application/json")

# Check if we got a response
if [ $? -eq 0 ]; then
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  
  echo ""
  echo "=========================================="
  echo "Extracting Token..."
  echo "=========================================="
  
  # Try to extract token using different methods
  TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('token', 'Not found'))" 2>/dev/null)
  
  if [ "$TOKEN" != "Not found" ] && [ -n "$TOKEN" ]; then
    echo ""
    echo "✅ Complete Auth Token:"
    echo "----------------------------------------"
    echo "$TOKEN"
    echo "----------------------------------------"
    echo ""
    echo "Token Length: ${#TOKEN} characters"
  else
    echo ""
    echo "⚠️  Full token not found in response."
    echo "This might mean:"
    echo "  1. Backend hasn't deployed the latest changes yet"
    echo "  2. The ?full=true parameter isn't working"
    echo ""
    echo "Response received:"
    echo "$RESPONSE" | head -20
  fi
else
  echo "❌ Failed to connect to backend"
fi

echo ""

