# PhonePe Request Format Analysis

## PhonePe Sample (Minimal)
```json
{
  "merchantOrderId": "TX123456",
  "amount": 100,
  "expireAfter": 1200,
  "metaInfo": {
    "udf1": "<additional-information-1>",
    ...
  },
  "paymentFlow": {
    "type": "PG_CHECKOUT"
  }
}
```

## Our Current Request (Full)
```json
{
  "merchantId": "M23OKIGC1N363",
  "merchantOrderId": "DUES_TEST_...",
  "amount": 100,
  "expireAfter": 1200,
  "merchantUserId": "test_user",
  "redirectUrl": "people-app://payment/callback?orderId=...",
  "redirectMode": "REDIRECT",
  "callbackUrl": "https://.../api/payment/webhook",
  "paymentFlow": {
    "type": "SDK"
  },
  "paymentInstrument": {
    "type": "UPI_INTENT"
  },
  "metaInfo": {
    "udf1": "",
    ...
  }
}
```

## Potential Issues

### 1. Extra Fields We're Sending
- `merchantUserId` - Not in PhonePe sample, might not be needed
- `redirectMode` - Not in PhonePe sample, might not be needed
- `paymentInstrument` - Not in PhonePe sample, might not be needed for SDK orders

### 2. Field Order
- PhonePe sample has fields in specific order
- Our order might be different

### 3. Empty metaInfo Fields
- PhonePe sample has values in metaInfo
- We're sending empty strings

### 4. paymentFlow.type
- PhonePe sample: "PG_CHECKOUT"
- Ours: "SDK" (but we need SDK orders)

## Testing Strategy

1. Try minimal request (only fields from PhonePe sample)
2. Try without optional fields
3. Try with metaInfo removed
4. Try different field order

