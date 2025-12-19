#!/bin/bash

# Script to test PhonePe API endpoints
# This script helps test the PhonePe integration

BACKEND_URL="https://freelancing-platform-backup.onrender.com"

echo "=========================================="
echo "PhonePe API Test Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Testing Auth Token Generation...${NC}"
echo "----------------------------------------"
AUTH_RESPONSE=$(curl -s -X GET "${BACKEND_URL}/api/payment/test-auth-token" \
  -H "Content-Type: application/json")

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Auth token generated successfully${NC}"
  echo "$AUTH_RESPONSE" | jq .
  
  TOKEN_LENGTH=$(echo "$AUTH_RESPONSE" | jq -r '.tokenLength')
  EXPIRES_AT=$(echo "$AUTH_RESPONSE" | jq -r '.expiresAtDate')
  
  echo ""
  echo "Token Details:"
  echo "  - Length: $TOKEN_LENGTH characters"
  echo "  - Expires: $EXPIRES_AT"
else
  echo -e "${YELLOW}❌ Failed to generate auth token${NC}"
fi

echo ""
echo -e "${BLUE}2. Generating Test Merchant Order ID...${NC}"
echo "----------------------------------------"
TIMESTAMP=$(date +%s%3N)
FREELANCER_ID="TEST_$(date +%s)"
MERCHANT_ORDER_ID="DUES_${FREELANCER_ID}_${TIMESTAMP}"
MERCHANT_ORDER_ID="${MERCHANT_ORDER_ID:0:63}"

echo -e "${GREEN}✅ Merchant Order ID generated${NC}"
echo "  Order ID: $MERCHANT_ORDER_ID"
echo "  Format: DUES_{freelancerId}_{timestamp}"
echo "  Length: ${#MERCHANT_ORDER_ID} characters"
echo ""

echo "=========================================="
echo "Test Credentials Summary"
echo "=========================================="
echo "Backend URL: $BACKEND_URL"
echo "Merchant Order ID: $MERCHANT_ORDER_ID"
echo "Auth Token: Generated (check response above for preview)"
echo ""

echo "To get the FULL auth token, check backend logs or use:"
echo "  curl -X GET '${BACKEND_URL}/api/payment/test-auth-token' | jq -r '.tokenPreview'"
echo ""
echo "Note: The test endpoint only shows a preview for security."
echo "The full token is used internally by the backend."
echo ""

