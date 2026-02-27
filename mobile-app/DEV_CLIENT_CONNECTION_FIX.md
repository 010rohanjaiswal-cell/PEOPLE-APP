# EAS Dev Build Connection Troubleshooting

## Common Issues and Solutions

### Issue: "Failed to connect" when using `npx expo start`

## Solution 1: Use Tunnel Mode (Recommended)

If you're on the same WiFi but still can't connect, use tunnel mode:

```bash
cd mobile-app
npx expo start --dev-client --tunnel
```

This uses Expo's tunnel service to bypass network issues.

## Solution 2: Use LAN Mode with Explicit Host

```bash
cd mobile-app
npx expo start --dev-client --lan
```

Then manually enter the IP address shown in the dev client app.

## Solution 3: Check Network Configuration

1. **Verify same network:**
   - Computer and phone must be on same WiFi
   - Check WiFi name matches exactly

2. **Check firewall:**
   - macOS: System Settings > Firewall
   - Allow Node.js/Expo through firewall

3. **Try different connection method:**
   ```bash
   # Option A: Tunnel (works through firewalls)
   npx expo start --dev-client --tunnel
   
   # Option B: LAN (faster, requires same network)
   npx expo start --dev-client --lan
   
   # Option C: Localhost (only for emulator)
   npx expo start --dev-client --localhost
   ```

## Solution 4: Manual Connection

1. Start dev server:
   ```bash
   npx expo start --dev-client
   ```

2. Note the connection URL shown (e.g., `exp://192.168.1.72:8081`)

3. In dev client app:
   - Tap "Enter URL manually"
   - Enter the exact URL shown

## Solution 5: Reset Metro Cache

```bash
cd mobile-app
npx expo start --dev-client --clear
```

## Solution 6: Check Dev Client Build

Make sure you installed the **development build**, not production:
- Development build has dev client features
- Production build is standalone (no dev client)

Verify by checking if the app shows connection options when opened.

## Quick Fix Commands

```bash
# Most reliable - Tunnel mode
npx expo start --dev-client --tunnel

# If tunnel is slow, try LAN
npx expo start --dev-client --lan

# For emulator only
npx expo start --dev-client --localhost
```

## Still Not Working?

1. Check if Metro bundler is actually running (should show QR code/URL)
2. Verify dev client app is the development build (not production)
3. Try restarting both computer and phone
4. Check if any VPN is interfering
5. Try using USB debugging with ADB reverse:
   ```bash
   adb reverse tcp:8081 tcp:8081
   npx expo start --dev-client
   ```

