# 🎨 Trading App - Implementation Guide

This guide explains the design decisions, patterns, and next steps for building out the complete trading application.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Patterns](#component-patterns)
3. [Animation Strategy](#animation-strategy)
4. [Data Flow](#data-flow)
5. [Next Steps](#next-steps)
6. [Advanced Features](#advanced-features)

## 🏗️ Architecture Overview

### Folder Structure Philosophy

```
app/                    # Expo Router screens (file-based routing)
├── (drawer)/          # Drawer navigation wrapper
│   ├── (tabs)/       # Bottom tab navigation
│   │   ├── index     # Portfolio screen (/)
│   │   └── two       # Markets screen (/two)
│   └── _layout       # Drawer config
├── (screens)/        # Modal/Stack screens (future)
│   ├── asset-detail  # Asset detail with charts
│   ├── trade-order   # Trade modal
│   └── ...
└── _layout           # Root with providers

components/            # Reusable UI components
├── shared/           # Generic components (Button, Card, etc.)
├── portfolio/        # Portfolio-specific components
├── markets/          # Markets-specific components
├── charts/           # Chart components (future)
└── animations/       # Animation wrappers (future)

utils/                # Utilities and helpers
├── dummyData.ts      # All mock data
├── formatters.ts     # Format numbers, dates, currency
├── animations.ts     # Reanimated configs
└── ThemeContext.tsx  # Theme provider

constants/            # Design tokens
├── colors.ts         # Color palette
├── typography.ts     # Type scale
└── spacing.ts        # Spacing system
```

### Why This Structure?

1. **Expo Router** - File-based routing is intuitive and performant
2. **Component Separation** - Easy to find and maintain specific UI elements
3. **Shared Constants** - Single source of truth for design tokens
4. **Utils Folder** - Keep business logic separate from UI

## 🧩 Component Patterns

### 1. Atomic Components

**Button.tsx** - The foundation
```typescript
Features:
- Multiple variants (primary, secondary, danger, ghost, outline)
- Size variants (small, medium, large)
- Loading state
- Disabled state
- Icon support
- Haptic feedback
- Scale animation on press

Usage:
<Button
  title="Buy Now"
  onPress={handleBuy}
  variant="primary"
  size="large"
  icon={<Icon />}
/>
```

### 2. Compound Components

**Card.tsx** - Container pattern
```typescript
Features:
- Gradient support
- Elevation/shadows
- Customizable padding
- Press animation
- Flexible children

Usage:
<Card gradient gradientColors={['#FF0000', '#00FF00']}>
  <Text>Content</Text>
</Card>
```

### 3. Smart Components

**PortfolioHeader.tsx** - Stateful display
```typescript
Features:
- Animated number counter
- Color-coded changes
- Formatted currency
- Auto-updates on data change

Internal Logic:
- useSharedValue for animation
- useAnimatedProps for text
- withTiming for smooth counting
```

## 🎭 Animation Strategy

### Performance First

All animations use **React Native Reanimated 3** which runs on the UI thread at 60fps.

### Animation Types

1. **Entrance Animations**
```typescript
entranceAnimations.fadeInUp(delay)
entranceAnimations.scaleUp(delay)
entranceAnimations.fadeInLeft(delay)
```

2. **Interaction Animations**
```typescript
buttonPressAnimation()  // Scale 0.95 → 1.0
pulseAnimation()        // Subtle breathing effect
shakeAnimation()        // Error feedback
```

3. **Value Animations**
```typescript
animateNumber(from, to, duration)  // Counter effect
drawLineAnimation()                // Chart line drawing
```

### Haptic Feedback

Strategic use of haptics enhances the premium feel:
```typescript
// Light impact for minor actions (button hover)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

// Medium impact for standard actions (button press)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

// Heavy impact for important actions (trade executed)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
```

## 📊 Data Flow

### Dummy Data Architecture

**dummyData.ts** contains:
- 30+ stocks with realistic prices
- Portfolio holdings with gains/losses
- Transaction history
- News articles
- Price alerts
- Candlestick data generators

### Data Updates

Currently static, but structured for easy animation:
```typescript
// When data changes, components automatically animate
useEffect(() => {
  animatedValue.value = withTiming(newValue);
}, [newValue]);
```

### Future: Real-time Data

Structure ready for WebSocket integration:
```typescript
// In a future implementation
useEffect(() => {
  const ws = new WebSocket('wss://api.example.com');
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    updatePrices(data);  // Triggers animations
  };
}, []);
```

## 🎯 Next Steps

### Phase 2: Additional Screens

#### 1. Activity/History Screen
```typescript
File: app/(drawer)/(tabs)/activity.tsx

Features:
- Transaction list with grouping by date
- Filter tabs (All, Orders, Deposits, Alerts)
- Swipe-to-cancel for pending orders
- Status badges (Filled, Pending, Cancelled)
- Empty state with illustration

Components to create:
- TransactionCard.tsx
- FilterTabs.tsx
- EmptyState.tsx
```

#### 2. Alerts Screen
```typescript
File: app/(drawer)/(tabs)/alerts.tsx

Features:
- Active alerts with progress bars
- Triggered alerts section
- Create new alert floating button
- Swipe to delete
- Visual progress toward target price

Components to create:
- AlertCard.tsx
- AlertProgress.tsx
- CreateAlertModal.tsx
```

#### 3. Profile Screen
```typescript
File: app/(drawer)/(tabs)/profile.tsx

Features:
- User avatar and info
- Account settings list
- Dark mode toggle (animated)
- Notification settings
- Sign out button

Components to create:
- ProfileHeader.tsx
- SettingsList.tsx
- ToggleSwitch.tsx (animated)
```

#### 4. Asset Detail Screen
```typescript
File: app/(screens)/asset-detail.tsx

Features:
- Full-screen interactive chart
- Candlestick/Line/Area chart toggle
- Timeframe selector (1m, 5m, 15m, 1h, 1D, 1W, 1M)
- Chart crosshair on touch
- Stats section (Open, High, Low, Volume, Market Cap)
- News articles
- About section
- Buy/Sell buttons

Components to create:
- InteractiveChart.tsx (complex!)
- ChartTypeToggle.tsx
- TimeframeSelector.tsx
- StatsGrid.tsx
- NewsCard.tsx
```

#### 5. Trade/Order Modal
```typescript
File: app/(screens)/trade-order.tsx

Features:
- Buy/Sell animated toggle
- Order type selector (Market, Limit, Stop)
- Quantity input with slider
- Real-time total calculation
- Validation indicators
- Order summary card
- Review and confirm flow
- Success animation with confetti

Components to create:
- BuySellToggle.tsx
- OrderTypeSelector.tsx
- QuantitySlider.tsx
- OrderSummary.tsx
- ConfirmationSheet.tsx
- SuccessAnimation.tsx (with confetti)
```

### Phase 3: Advanced Features

#### 1. Interactive Charts

**Candlestick Chart with Victory Native XL**
```typescript
import { CartesianChart, Candlestick } from "victory-native";

<CartesianChart
  data={candleData}
  xKey="timestamp"
  yKeys={["open", "high", "low", "close"]}
>
  <Candlestick />
</CartesianChart>
```

**Features to Implement:**
- Pan gesture to scroll
- Pinch to zoom
- Crosshair on long press
- Price tooltip
- Volume bars below
- Gradient area fill for line chart
- 60fps smooth performance

#### 2. Pull to Refresh

Custom implementation with spring physics:
```typescript
const PullToRefresh = () => {
  const translateY = useSharedValue(0);
  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd(() => {
      if (translateY.value > REFRESH_THRESHOLD) {
        onRefresh();
      }
      translateY.value = withSpring(0);
    });
};
```

#### 3. Swipeable Cards

For delete/favorite actions:
```typescript
import { Swipeable } from 'react-native-gesture-handler';

<Swipeable
  renderRightActions={() => (
    <DeleteButton onPress={handleDelete} />
  )}
  renderLeftActions={() => (
    <FavoriteButton onPress={handleFavorite} />
  )}
>
  <Card>...</Card>
</Swipeable>
```

#### 4. Bottom Sheets

Smooth modals from bottom:
```typescript
import BottomSheet from '@gorhom/bottom-sheet';

<BottomSheet
  snapPoints={['25%', '50%', '90%']}
  backdropComponent={BlurBackdrop}
>
  {content}
</BottomSheet>
```

#### 5. Skeleton Loaders

Shimmer effect while loading:
```typescript
const SkeletonCard = () => {
  const opacity = useSharedValue(0.3);
  
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 1000 }),
      -1,
      true
    );
  }, []);
  
  return <Animated.View style={[styles.skeleton, { opacity }]} />;
};
```

## 🎨 Design System Extensions

### Adding New Colors

```typescript
// constants/colors.ts
export const colors = {
  dark: {
    // Existing colors...
    info: '#17A2B8',        // Info messages
    accentPurple: '#9C27B0', // Premium features
  },
};
```

### Adding New Typography

```typescript
// constants/typography.ts
export const typography = {
  // Existing...
  display: { fontSize: 64, fontWeight: '800', lineHeight: 72 },
  code: { fontSize: 14, fontFamily: 'monospace', lineHeight: 20 },
};
```

### Custom Shadow Presets

```typescript
// constants/spacing.ts
export const shadows = {
  // Existing...
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
};
```

## 🔄 State Management

### Current: React State + Context

- ThemeContext for theme switching
- Local state for screen-specific data
- Props for component communication

### Future: Consider for Scale

**If app grows complex:**

1. **Zustand** (Lightweight)
```typescript
import create from 'zustand';

const useStore = create((set) => ({
  portfolio: initialPortfolio,
  updatePortfolio: (data) => set({ portfolio: data }),
}));
```

2. **Redux Toolkit** (Enterprise)
```typescript
// Only if you have truly complex state logic
// Most trading apps don't need this
```

3. **TanStack Query** (Data Fetching)
```typescript
// When connecting to real API
const { data, refetch } = useQuery('portfolio', fetchPortfolio);
```

## 🧪 Testing Strategy

### Unit Tests
```typescript
// Button.test.tsx
test('button shows loading spinner when loading prop is true', () => {
  const { getByTestId } = render(
    <Button title="Test" loading={true} onPress={() => {}} />
  );
  expect(getByTestId('loading-spinner')).toBeTruthy();
});
```

### Integration Tests
```typescript
// PortfolioScreen.test.tsx
test('portfolio screen displays holdings correctly', () => {
  const { getAllByTestId } = render(<PortfolioScreen />);
  expect(getAllByTestId('holding-card')).toHaveLength(userHoldings.length);
});
```

### E2E Tests (Detox)
```typescript
describe('Trading Flow', () => {
  it('should complete a trade', async () => {
    await element(by.id('asset-card-AAPL')).tap();
    await element(by.id('buy-button')).tap();
    await element(by.id('quantity-input')).typeText('10');
    await element(by.id('review-order')).tap();
    await expect(element(by.id('success-message'))).toBeVisible();
  });
});
```

## 📱 Platform-Specific Considerations

### iOS
- Use native haptics (works out of the box)
- Safe area handling with SafeAreaView
- Consider iOS-specific gestures

### Android
- Ensure material design patterns
- Handle hardware back button
- Test on various screen sizes
- StatusBar color coordination

## 🚀 Performance Optimization Checklist

- [ ] Use FlashList for long lists
- [ ] Memoize expensive components
- [ ] Use useMemo for calculations
- [ ] Use useCallback for functions passed to children
- [ ] Run animations on UI thread (Reanimated)
- [ ] Optimize images (use Expo Image)
- [ ] Enable Hermes engine
- [ ] Profile with React DevTools
- [ ] Test on real devices, not just simulators

## 🎓 Learning Resources

### React Native Reanimated
- [Official Docs](https://docs.swmansion.com/react-native-reanimated/)
- Worklets run on UI thread (60fps)
- useSharedValue, useAnimatedStyle, withTiming, withSpring

### Expo Router
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- File-based routing
- Type-safe navigation

### Victory Native
- [Victory Native Docs](https://commerce.nearform.com/open-source/victory-native/)
- Charts with gestures
- Skia-powered performance

## 📝 Code Style Guide

### Component Template
```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/utils/ThemeContext';

interface MyComponentProps {
  title: string;
  onPress?: () => void;
}

export default function MyComponent({ title, onPress }: MyComponentProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
```

### Best Practices
1. Always destructure props
2. Use TypeScript interfaces
3. Extract styles to StyleSheet
4. Use theme colors dynamically
5. Add comments for complex logic
6. Keep components under 200 lines

## 🎉 Congratulations!

You now have a solid foundation for a world-class trading app. The architecture is scalable, the components are reusable, and the animations are smooth. 

**Next Actions:**
1. Implement remaining screens (Activity, Alerts, Profile)
2. Build out the Asset Detail screen with charts
3. Create the Trade Order modal
4. Add more micro-interactions
5. Polish animations and transitions
6. Test on real devices
7. Gather user feedback
8. Iterate and improve

**Remember:** Great apps are built iteratively. Ship features one at a time, test thoroughly, and always prioritize user experience over feature count.

Happy coding! 🚀
