#!/bin/bash

# Script to test PhonePe SDK order creation and get order token
# This directly calls PhonePe API to test if SDK orders work

BACKEND_URL="https://freelancing-platform-backend-backup.onrender.com"
PHONEPE_API_URL="https://api.phonepe.com/apis/pg"
PHONEPE_MERCHANT_ID="M23OKIGC1N363"

echo "=========================================="
echo "Testing PhonePe SDK Order Creation"
echo "=========================================="
echo ""

# Step 1: Get Auth Token
echo "Step 1: Getting Auth Token..."
AUTH_TOKEN=$(curl -s -X GET "${BACKEND_URL}/api/payment/test-auth-token?full=true" \
  -H "Content-Type: application/json" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('token', ''))")

if [ -z "$AUTH_TOKEN" ]; then
  echo "❌ Failed to get auth token"
  exit 1
fi

echo "✅ Auth token obtained (length: ${#AUTH_TOKEN} chars)"
echo ""

# Step 2: Generate Test Merchant Order ID
echo "Step 2: Generating Test Merchant Order ID..."
TIMESTAMP=$(date +%s%3N)
TEST_ORDER_ID="TEST_${TIMESTAMP}"
MERCHANT_ORDER_ID="DUES_TEST_${TIMESTAMP}"
MERCHANT_ORDER_ID="${MERCHANT_ORDER_ID:0:63}"

echo "✅ Merchant Order ID: $MERCHANT_ORDER_ID"
echo ""

# Step 3: Create SDK Order Request
echo "Step 3: Creating SDK Order Request..."
echo "Endpoint: ${PHONEPE_API_URL}/checkout/v2/sdk/order"
echo ""

# Create request body
REQUEST_BODY=$(cat <<EOF
{
  "merchantId": "${PHONEPE_MERCHANT_ID}",
  "merchantOrderId": "${MERCHANT_ORDER_ID}",
  "amount": 100,
  "merchantUserId": "test_user",
  "redirectUrl": "people-app://payment/callback?orderId=${MERCHANT_ORDER_ID}",
  "redirectMode": "REDIRECT",
  "callbackUrl": "${BACKEND_URL}/api/payment/webhook",
  "paymentFlow": "SDK",
  "paymentInstrument": {
    "type": "UPI_INTENT"
  }
}
EOF
)

echo "Request Body:"
echo "$REQUEST_BODY" | python3 -m json.tool
echo ""

# Step 4: Make API Call
echo "Step 4: Calling PhonePe SDK Order API..."
echo "----------------------------------------"

# Make request and capture both body and status code
TEMP_FILE=$(mktemp)
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$TEMP_FILE" -X POST "${PHONEPE_API_URL}/checkout/v2/sdk/order" \
  -H "Content-Type: application/json" \
  -H "Authorization: O-Bearer ${AUTH_TOKEN}" \
  -d "$REQUEST_BODY")

HTTP_BODY=$(cat "$TEMP_FILE")
rm "$TEMP_FILE"

echo "HTTP Status Code: $HTTP_CODE"
echo ""

# Parse and display response
echo "Response Body:"
echo "$HTTP_BODY" | python3 -m json.tool 2>/dev/null || echo "$HTTP_BODY"
echo ""

# Check if we got orderToken
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  ORDER_TOKEN=$(echo "$HTTP_BODY" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('orderToken', data.get('orderToken', '')))" 2>/dev/null)
  ORDER_ID=$(echo "$HTTP_BODY" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('orderId', data.get('orderId', '')))" 2>/dev/null)
  
  if [ -n "$ORDER_TOKEN" ] && [ "$ORDER_TOKEN" != "None" ]; then
    echo "=========================================="
    echo "✅ SUCCESS! Order Token Received"
    echo "=========================================="
    echo "Order Token: $ORDER_TOKEN"
    echo "Order ID: $ORDER_ID"
    echo "Merchant Order ID: $MERCHANT_ORDER_ID"
    echo ""
    echo "✅ SDK order creation is working!"
  else
    echo "⚠️  Response successful but orderToken not found in response"
  fi
else
  echo "=========================================="
  echo "❌ SDK Order Creation Failed"
  echo "=========================================="
  echo "Status Code: $HTTP_CODE"
  echo ""
  ERROR_MSG=$(echo "$HTTP_BODY" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('message', data.get('error', 'Unknown error')))" 2>/dev/null)
  ERROR_CODE=$(echo "$HTTP_BODY" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('code', 'UNKNOWN'))" 2>/dev/null)
  
  echo "Error Code: $ERROR_CODE"
  echo "Error Message: $ERROR_MSG"
  echo ""
  echo "This indicates:"
  echo "  - SDK orders may not be enabled for your merchant account"
  echo "  - Contact PhonePe support to enable SDK orders"
  echo "  - Merchant ID: $PHONEPE_MERCHANT_ID"
fi

echo ""

