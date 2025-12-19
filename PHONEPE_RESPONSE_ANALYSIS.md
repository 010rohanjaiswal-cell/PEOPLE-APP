# PhonePe Support Response Analysis

## Response from PhonePe Team

**From:** Darshan Naik, PhonePe Integration Team  
**Message:** "We have observed that the submitted request appears to be incorrect."

## PhonePe Sample Request

```json
{
  "merchantOrderId": "TX123456",
  "amount": 100,
  "expireAfter": 1200,
  "metaInfo": {
    "udf1": "<additional-information-1>",
    "udf2": "<additional-information-2>",
    "udf3": "<additional-information-3>",
    "udf4": "<additional-information-4>",
    "udf5": "<additional-information-5>",
    "udf6": "additional-information-6",
    "udf7": "additional-information-7",
    "udf8": "additional-information-8",
    "udf9": "additional-information-9",
    "udf10": "additional-information-10",
    "udf11": "additional-information-11",
    "udf12": "additional-information-12",
    "udf13": "additional-information-13",
    "udf14": "additional-information-14",
    "udf15": "additional-information-15"
  },
  "paymentFlow": {
    "type": "PG_CHECKOUT"
  }
}
```

## Key Observations

### 1. paymentFlow Type
- **PhonePe Sample:** `"type": "PG_CHECKOUT"`
- **Our Implementation:** `"type": "SDK"`
- **Note:** We're using SDK because we want SDK orders, but their sample shows PG_CHECKOUT

### 2. Missing Fields in Sample
PhonePe's sample doesn't show:
- `merchantId` (but this is required in actual API calls)
- `redirectUrl` (required for SDK orders)
- `callbackUrl` (required for SDK orders)
- `paymentInstrument` (required for SDK orders)
- `merchantUserId` (commonly used)

### 3. Fields Present in Sample
- ✅ `merchantOrderId`
- ✅ `amount`
- ✅ `expireAfter` (we don't include this, but it's optional)
- ✅ `metaInfo` (we include this)
- ✅ `paymentFlow` (we include this, but with different type)

## Analysis

### Possible Issues

1. **paymentFlow type:** 
   - Their sample shows `PG_CHECKOUT`, but we need `SDK` for SDK orders
   - This might be a generic sample, not SDK-specific

2. **Missing expireAfter:**
   - Their sample includes `expireAfter: 1200`
   - We don't include it (it's optional, but maybe PhonePe expects it?)

3. **Request structure:**
   - Their sample is minimal (only core fields)
   - Our request includes additional required fields for SDK orders

## Action Items

1. **Add expireAfter** to our request (even though optional, PhonePe sample includes it)
2. **Verify paymentFlow type** - Keep as `SDK` since we need SDK orders
3. **Ensure all required SDK fields are present** - merchantId, redirectUrl, callbackUrl, paymentInstrument

## Updated Request Format

Based on PhonePe's sample, we should include:
- ✅ merchantOrderId
- ✅ amount
- ✅ expireAfter (add this - PhonePe sample includes it)
- ✅ metaInfo (already included)
- ✅ paymentFlow (keep as `{ type: "SDK" }` for SDK orders)
- ✅ Plus SDK-specific fields: merchantId, redirectUrl, callbackUrl, paymentInstrument

