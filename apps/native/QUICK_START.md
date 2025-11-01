# 🚀 Quick Start Guide - Trading App

Get your modern trading app up and running in minutes!

## ✅ Prerequisites

- **Node.js** 18 or higher
- **Bun** (recommended) or npm/yarn
- **Expo Go** app on your phone (optional)
- **iOS Simulator** (Mac) or **Android Emulator**

## 📦 Installation

### 1. Navigate to the Native App Directory

```bash
cd apps/native
```

### 2. Install Dependencies

All required packages are already added to `package.json`. Just run:

```bash
bun install
```

This will install:
- React Native Reanimated 3
- React Native Gesture Handler
- Victory Native (for charts)
- Expo Linear Gradient
- Expo Haptics
- React Native Confetti Cannon
- @shopify/flash-list
- And all other dependencies

### 3. Start the Development Server

```bash
bun start
```

Or use the Expo CLI directly:

```bash
npx expo start
```

### 4. Run on Your Device

Once the Metro bundler is running, you have several options:

#### Option A: Physical Device (Recommended for Testing)

1. Install **Expo Go** from App Store (iOS) or Play Store (Android)
2. Scan the QR code shown in your terminal
3. App will load on your device

#### Option B: iOS Simulator (Mac only)

Press `i` in the terminal, or:

```bash
npx expo run:ios
```

#### Option C: Android Emulator

Press `a` in the terminal, or:

```bash
npx expo run:android
```

## 🎯 What You'll See

### Home Screen (Portfolio)
- Animated portfolio value: **$45,234.56**
- Today's gain: **+$1,234.56 (+2.8%)**
- Interactive chart placeholder
- Quick action buttons (Deposit, Withdraw, Trade)
- Your holdings with gains/losses
- Cash balance

### Markets Screen
- Search bar for stocks and crypto
- Category tabs (All, Stocks, Crypto, Forex)
- Top Movers section with horizontal scroll
- List of 30+ assets with live-looking data
- Mini sparklines and price changes

## 🔄 Development Workflow

### Making Changes

1. **Edit any file** - Changes will hot reload automatically
2. **Save** - See updates instantly on your device/simulator
3. **Shake device** - Open developer menu for debugging

### Common Commands

```bash
# Start development server
bun start

# Clear cache and restart
bun start -c

# Run on specific platform
npx expo run:ios
npx expo run:android

# Run on web (experimental)
npx expo start --web
```

### Debugging

```bash
# Open React DevTools
Press 'j' in terminal

# Toggle element inspector
Shake device → "Show Element Inspector"

# View logs
All console.log() output appears in terminal
```

## 🎨 Customization Quick Tips

### Change Colors

Edit `constants/colors.ts`:

```typescript
export const colors = {
  dark: {
    primary: '#5B7FFF',  // Change this to your brand color
    // ...
  },
};
```

### Modify Dummy Data

Edit `utils/dummyData.ts`:

```typescript
export const stocks: Stock[] = [
  // Add your own stocks here
  {
    symbol: 'YOURCO',
    name: 'Your Company',
    price: 150.00,
    // ...
  },
];
```

### Add New Screens

Create file in `app/(drawer)/(tabs)/`:

```typescript
// app/(drawer)/(tabs)/newscreen.tsx
import { View, Text } from 'react-native';

export default function NewScreen() {
  return (
    <View>
      <Text>My New Screen</Text>
    </View>
  );
}
```

Update `_layout.tsx` to add tab:

```typescript
<Tabs.Screen
  name="newscreen"
  options={{
    title: "New",
    tabBarIcon: ({ color }) => <TabBarIcon name="star-outline" color={color} />,
  }}
/>
```

## 📱 Testing on Real Device

### Why Test on Real Device?

- **True Performance** - Simulators can't match real device performance
- **Haptic Feedback** - Only works on real devices
- **Gestures** - Touch interactions feel different
- **Real-world Conditions** - Network, battery, notifications

### Recommended Test Scenarios

1. **Portfolio Screen**
   - ✅ Pull down to refresh
   - ✅ Scroll through holdings
   - ✅ Tap on holding card
   - ✅ Check animation smoothness

2. **Markets Screen**
   - ✅ Search for stocks
   - ✅ Switch category tabs
   - ✅ Scroll through top movers
   - ✅ Tap on asset card

3. **Performance**
   - ✅ Check animations are smooth (60fps)
   - ✅ Verify haptic feedback works
   - ✅ Test on low-end device if possible

## 🐛 Troubleshooting

### Issue: Metro bundler won't start

**Solution:**
```bash
# Clear watchman
watchman watch-del-all

# Clear Metro cache
npx expo start -c

# Delete node_modules and reinstall
rm -rf node_modules
bun install
```

### Issue: "Unable to resolve module"

**Solution:**
```bash
# Clear Metro bundler cache
npx expo start -c

# If still failing, restart from scratch
rm -rf node_modules
bun install
npx expo start
```

### Issue: Animations are laggy

**Solution:**
- Test on a real device (simulators are slower)
- Close other apps to free up resources
- Check if you're in Debug mode (Release is faster)
- Verify Reanimated is properly installed

### Issue: TypeScript errors

**Solution:**
```bash
# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"

# Check tsconfig.json is correct
```

### Issue: iOS build fails

**Solution:**
```bash
cd ios
pod install
cd ..
npx expo run:ios
```

### Issue: Android build fails

**Solution:**
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

## 📚 Next Steps

Once you have the app running:

1. **Explore the Code**
   - Check out `components/` for UI building blocks
   - Look at `utils/dummyData.ts` for data structure
   - Review `utils/animations.ts` for animation patterns

2. **Read the Documentation**
   - `TRADING_APP_README.md` - Full project overview
   - `IMPLEMENTATION_GUIDE.md` - Deep dive into architecture

3. **Start Building**
   - Implement Activity screen
   - Add Alerts functionality
   - Create Profile screen
   - Build Asset Detail with charts

4. **Customize**
   - Change colors to match your brand
   - Add your own dummy data
   - Create custom components
   - Experiment with animations

## 💡 Pro Tips

### Fast Refresh

Save any file to see changes instantly. Component state is preserved during fast refresh!

### Console Logging

```typescript
console.log('Debug:', data);  // Shows in terminal
```

### Performance Monitoring

```typescript
import { InteractionManager } from 'react-native';

InteractionManager.runAfterInteractions(() => {
  // This runs after animations complete
  fetchData();
});
```

### Expo Dev Client

For even better DX, build a development client:

```bash
npx expo install expo-dev-client
npx expo prebuild
npx expo run:ios
```

## 🎉 You're Ready!

You now have a fully functional trading app UI running on your device. The app includes:

- ✅ 2 main screens (Portfolio, Markets)
- ✅ Smooth animations with Reanimated
- ✅ Comprehensive dummy data
- ✅ Beautiful dark theme
- ✅ Haptic feedback
- ✅ Type-safe TypeScript
- ✅ Reusable component library

**Happy coding!** 🚀

---

## 🆘 Need Help?

- Check existing documentation files
- Review component source code
- Test on real device if simulator is slow
- Clear cache and restart if things break

## 📖 Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Reanimated Docs](https://docs.swmansion.com/react-native-reanimated/)
- [Expo Router Guide](https://docs.expo.dev/router/introduction/)

Remember: Start simple, iterate quickly, and always test on real devices!
