# SDK Order Format Issue Analysis

## Key Finding

**When testing `paymentFlow.type = "PG_CHECKOUT"`:**
- Status: **400 Bad Request** (not 500!)
- Error: Validation error about udf11-15 fields
- **This means:** The request format is being processed, but has validation issues

**When testing `paymentFlow.type = "SDK"`:**
- Status: **500 Internal Server Error**
- Error: "There is an error trying to process your transaction at the moment"
- **This means:** SDK flow is failing at server level

## Analysis

### Why PG_CHECKOUT Works (Gets 400, Not 500)

1. ✅ Request reaches PhonePe servers
2. ✅ Format is being validated
3. ❌ Validation fails on empty udf11-15 fields
4. **Result:** 400 Bad Request (format issue, fixable)

### Why SDK Fails (Gets 500)

1. ❌ Request fails at server level
2. ❌ Not a validation error (would be 400)
3. ❌ Server cannot process SDK order
4. **Result:** 500 Internal Server Error (server issue)

## Possible Causes for SDK 500 Error

### 1. Missing Required Fields for SDK
SDK orders might require fields that PG_CHECKOUT doesn't need:
- `merchantUserId` - Maybe required for SDK?
- `redirectUrl` - Required for SDK (deep link callback)
- `callbackUrl` - Required for SDK (webhook)
- `paymentInstrument` - Required for SDK
- `redirectMode` - Maybe required for SDK?

### 2. SDK-Specific Configuration
- Maybe SDK orders need to be configured differently in dashboard
- Maybe there's a different endpoint for SDK orders
- Maybe SDK requires additional approval/verification

### 3. Field Format Issues
- Maybe `paymentFlow.type = "SDK"` needs additional properties
- Maybe SDK requires different field values
- Maybe field order matters

## Test Results Summary

| Test | paymentFlow.type | Fields | Result |
|------|-----------------|--------|--------|
| 1 | SDK | Minimal (no metaInfo) | 500 Error |
| 2 | SDK | + redirectUrl, callbackUrl | 500 Error |
| 3 | SDK | + paymentInstrument | 500 Error |
| 4 | SDK | + metaInfo (udf1-10 only) | 500 Error |
| 5 | PG_CHECKOUT | Full | 400 Error (validation) |

## Next Steps

1. **Ask PhonePe:** What are the exact required fields for SDK orders?
2. **Check Dashboard:** Is there SDK-specific configuration needed?
3. **Verify Endpoint:** Is `/checkout/v2/sdk/order` the correct endpoint?
4. **Check Documentation:** Are there SDK-specific requirements we're missing?

## Important Note

The fact that `PG_CHECKOUT` gives 400 (validation) while `SDK` gives 500 (server error) suggests:
- **SDK flow might need different/additional fields**
- **Or SDK orders require special configuration/enablement beyond what PhonePe said**

We need PhonePe to provide the exact SDK order request format, not just a generic sample.

