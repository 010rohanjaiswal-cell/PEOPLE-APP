# PhonePe Sample Request vs Our Implementation

## PhonePe Support Team Response

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

## Our Current Implementation

```json
{
  "merchantId": "M23OKIGC1N363",
  "merchantOrderId": "DUES_TEST_17661417613N",
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
    "udf2": "",
    ...
    "udf15": ""
  }
}
```

## Key Differences

### 1. paymentFlow.type
- **PhonePe Sample:** `"PG_CHECKOUT"`
- **Our Implementation:** `"SDK"`
- **Note:** We need SDK orders, so we use `"SDK"`. Their sample might be generic.

### 2. Fields in Our Request (Not in PhonePe Sample)
- `merchantId` - Required for all API calls
- `merchantUserId` - Commonly used
- `redirectUrl` - Required for SDK orders (deep link callback)
- `redirectMode` - Required for SDK orders
- `callbackUrl` - Required for webhook callbacks
- `paymentInstrument` - Required for SDK orders

### 3. Fields in PhonePe Sample (Now in Our Request)
- ✅ `merchantOrderId` - We have this
- ✅ `amount` - We have this
- ✅ `expireAfter` - **NOW ADDED** (was missing before)
- ✅ `metaInfo` - We have this
- ✅ `paymentFlow` - We have this (but with "SDK" instead of "PG_CHECKOUT")

## Changes Made

### ✅ Added expireAfter
- **Before:** Not included (optional field)
- **After:** `expireAfter: 1200` (20 minutes)
- **Reason:** PhonePe sample includes it, so we added it

### ✅ Already Had
- `merchantOrderId` ✅
- `amount` ✅
- `metaInfo` ✅ (all 15 fields)
- `paymentFlow` ✅ (as Object with type)

## Important Notes

1. **paymentFlow.type = "SDK"** - We're keeping this because:
   - We need SDK orders (not PG_CHECKOUT)
   - Their sample shows `PG_CHECKOUT` which is for web payments
   - SDK orders require `paymentFlow.type = "SDK"`

2. **Additional Fields** - We include fields not in their sample because:
   - `merchantId` is required for authentication
   - `redirectUrl`, `callbackUrl`, `paymentInstrument` are required for SDK orders
   - These are SDK-specific requirements

3. **expireAfter** - Now included as per their sample

## Test Result

After adding `expireAfter`, we still get 500 error. This suggests:
- The format is now closer to their sample
- But the 500 error persists (likely still SDK orders not enabled)
- We should verify if there are any other format issues

## Next Steps

1. ✅ Added `expireAfter` - Done
2. ⚠️ Verify if `paymentFlow.type` should be "SDK" or something else
3. ⚠️ Check if all required SDK fields are correct
4. ⚠️ Test again after PhonePe enables SDK orders

## Response to PhonePe

We should respond to PhonePe confirming:
- We've added `expireAfter` as per their sample
- We're using `paymentFlow.type = "SDK"` because we need SDK orders (not PG_CHECKOUT)
- We include additional fields (merchantId, redirectUrl, callbackUrl, paymentInstrument) required for SDK orders
- Ask if the sample is for SDK orders or generic, and if we need to adjust anything

