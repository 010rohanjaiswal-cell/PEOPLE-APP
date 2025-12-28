# Wireless Debugging Setup for Android

## Step 1: Connect Phone via USB (Required First Time)

1. Connect your Android phone to your Mac via USB
2. On your phone, enable **USB Debugging**:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times to enable Developer Options
   - Go to Settings → Developer Options
   - Enable "USB Debugging"

## Step 2: Enable Wireless Debugging on Phone

1. On your phone, go to **Settings → Developer Options**
2. Enable **"Wireless debugging"** (Android 11+)
3. Tap on "Wireless debugging" to open it
4. Note the **IP address and port** shown (e.g., `192.168.1.100:5555`)

## Step 3: Connect via ADB

Once wireless debugging is enabled, run:

```bash
adb connect <your-phone-ip>:<port>
# Example: adb connect 192.168.1.100:5555
```

## Alternative: Using USB First, Then Switch to Wireless

If wireless debugging option is not available:

1. Connect phone via USB
2. Run: `adb tcpip 5555`
3. Disconnect USB
4. Run: `adb connect <your-phone-ip>:5555`

## Verify Connection

```bash
adb devices
# Should show your phone connected wirelessly
```

## Your Mac's IP Address

Your Mac's IP: `192.168.1.72`

Make sure your phone and Mac are on the same Wi-Fi network!

