# How to Install Java 17 for React Native Development

## Option 1: Manual Download (Easiest - No Terminal Password)

1. **Download Java 17:**
   - Go to: https://adoptium.net/temurin/releases/?version=17
   - Select:
     - **Operating System:** macOS
     - **Architecture:** 
       - `aarch64` if you have Apple Silicon (M1/M2/M3 Mac)
       - `x64` if you have Intel Mac
     - **Package Type:** JDK
   - Click "Latest Release" to download the .pkg file

2. **Install:**
   - Double-click the downloaded .pkg file
   - Follow the installation wizard
   - Enter your Mac password when prompted (this is normal)

3. **Verify Installation:**
   ```bash
   /usr/libexec/java_home -V
   ```
   You should see Java 17 listed.

4. **Set JAVA_HOME:**
   ```bash
   export JAVA_HOME=$(/usr/libexec/java_home -v 17)
   echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
   ```

5. **Verify:**
   ```bash
   java -version
   ```
   Should show version 17.x.x

## Option 2: Homebrew (Requires Terminal Password)

**Important:** When typing your password in terminal, **nothing will appear on screen** - this is normal for security!

1. **Type the command:**
   ```bash
   brew install --cask temurin@17
   ```

2. **When prompted for password:**
   - Type your Mac password (you won't see anything)
   - Press Enter
   - Wait for installation to complete

3. **Set JAVA_HOME:**
   ```bash
   export JAVA_HOME=$(/usr/libexec/java_home -v 17)
   echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
   ```

## After Installation

Run the setup script:
```bash
cd mobile-app
source setup-java.sh
```

Then try building:
```bash
npx expo run:android
```

