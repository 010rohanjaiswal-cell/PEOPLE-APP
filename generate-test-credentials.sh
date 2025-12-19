#!/bin/bash

# Script to generate PhonePe auth token and merchant order ID

echo "=========================================="
echo "PhonePe Test Credentials Generator"
echo "=========================================="
echo ""

# Backend URL
BACKEND_URL="https://freelancing-platform-backend-backup.onrender.com"

echo "1. Generating Auth Token..."
echo "----------------------------------------"
AUTH_RESPONSE=$(curl -s -X GET "${BACKEND_URL}/api/payment/test-auth-token" \
  -H "Content-Type: application/json")

echo "$AUTH_RESPONSE" | jq .

# Extract token preview and expiry
TOKEN_PREVIEW=$(echo "$AUTH_RESPONSE" | jq -r '.tokenPreview')
TOKEN_LENGTH=$(echo "$AUTH_RESPONSE" | jq -r '.tokenLength')
EXPIRES_AT=$(echo "$AUTH_RESPONSE" | jq -r '.expiresAtDate')

echo ""
echo "Auth Token Details:"
echo "  Preview: $TOKEN_PREVIEW"
echo "  Length: $TOKEN_LENGTH characters"
echo "  Expires: $EXPIRES_AT"
echo ""

echo "2. Generating Merchant Order ID..."
echo "----------------------------------------"
TIMESTAMP=$(date +%s%3N)  # Milliseconds timestamp
FREELANCER_ID="TEST_USER_$(date +%s)"
MERCHANT_ORDER_ID="DUES_${FREELANCER_ID}_${TIMESTAMP}"
# Ensure max 63 characters (PhonePe requirement)
MERCHANT_ORDER_ID="${MERCHANT_ORDER_ID:0:63}"

echo "Merchant Order ID: $MERCHANT_ORDER_ID"
echo "Format: DUES_{freelancerId}_{timestamp}"
echo "Length: ${#MERCHANT_ORDER_ID} characters"
echo ""

echo "=========================================="
echo "Summary:"
echo "=========================================="
echo "Auth Token Preview: $TOKEN_PREVIEW"
echo "Auth Token Length: $TOKEN_LENGTH"
echo "Token Expires: $EXPIRES_AT"
echo "Merchant Order ID: $MERCHANT_ORDER_ID"
echo ""

echo "To use these in API calls:"
echo "  - Auth Token: Use the full token from backend (not shown for security)"
echo "  - Merchant Order ID: $MERCHANT_ORDER_ID"
echo ""

