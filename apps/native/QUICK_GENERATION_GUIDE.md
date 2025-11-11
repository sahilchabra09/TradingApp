# Quick Screen Generation Guide

Since running the TypeScript generation script requires additional setup, here's a simple manual approach to generate all remaining screens quickly.

## 📋 Screen Template

Copy this template for each new screen, replacing the placeholders:

```typescript
/**
 * [SCREEN_NAME]
 * [DESCRIPTION]
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../utils/hooks';
import { GradientBackground, Button, Card } from '../../components';

export const [SCREEN_NAME]: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  return (
    <GradientBackground>
      <ScrollView
        style={[styles.container, { padding: theme.spacing.base }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.emoji}>[EMOJI]</Text>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.text.primary,
                fontSize: theme.typography.sizes['3xl'],
                marginTop: theme.spacing.xl,
                marginBottom: theme.spacing.md,
              },
            ]}
          >
            [TITLE]
          </Text>
          <Text
            style={[
              styles.description,
              {
                color: theme.colors.text.secondary,
                fontSize: theme.typography.sizes.base,
                marginBottom: theme.spacing['3xl'],
              },
            ]}
          >
            [DESCRIPTION]
          </Text>

          {/* Add your screen content here */}
          <Card style={{ marginBottom: theme.spacing.md }}>
            <Text style={{ color: theme.colors.text.primary }}>
              Screen content goes here
            </Text>
          </Card>

          <Button
            title="Primary Action"
            onPress={() => {
              // Handle primary action
            }}
            loading={loading}
            variant="primary"
            fullWidth
          />
        </View>
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
```

## 🗂 Screens to Create

### KYC Folder (`src/screens/kyc/`)

1. **KYCStartScreen.tsx**
   - Emoji: 📋
   - Title: KYC Start
   - Description: Introduction to KYC process with steps overview

2. **DocumentCaptureScreen.tsx**
   - Emoji: 📸
   - Title: Document Capture
   - Description: Camera interface for ID/Passport capture

3. **NFCVerificationScreen.tsx**
   - Emoji: 📱
   - Title: NFC Verification
   - Description: NFC chip scanning for passport verification

4. **FaceMatchScreen.tsx**
   - Emoji: 🤳
   - Title: Face Match
   - Description: Liveness detection and face matching

5. **KYCStatusScreen.tsx**
   - Emoji: ✅
   - Title: KYC Status
   - Description: KYC review status with progress tracker

**Index file** (`kyc/index.ts`):
```typescript
export { KYCStartScreen } from './KYCStartScreen';
export { DocumentCaptureScreen } from './DocumentCaptureScreen';
export { NFCVerificationScreen } from './NFCVerificationScreen';
export { FaceMatchScreen } from './FaceMatchScreen';
export { KYCStatusScreen } from './KYCStatusScreen';
```

---

### Home Folder (`src/screens/home/`)

1. **PortfolioDetailScreen.tsx**
   - Emoji: 📊
   - Title: Portfolio Detail
   - Description: Detailed holdings breakdown with performance charts

**Index file** (`home/index.ts`):
```typescript
export { HomeDashboardScreen } from './HomeDashboardScreen';
export { PortfolioDetailScreen } from './PortfolioDetailScreen';
```

---

### Trade Folder (`src/screens/trade/`)

1. **QuickTradeScreen.tsx**
   - Emoji: ⚡
   - Title: Quick Trade
   - Description: Simple buy/sell interface with market orders

2. **OrderFormScreen.tsx**
   - Emoji: 📝
   - Title: Order Form
   - Description: Advanced order types: limit, stop-loss, stop-limit

3. **OrderConfirmModal.tsx**
   - Emoji: ✔️
   - Title: Order Confirm
   - Description: Review order details before submission

4. **OrdersHistoryScreen.tsx**
   - Emoji: 📜
   - Title: Orders History
   - Description: All orders: open, filled, partially filled, cancelled

**Index file** (`trade/index.ts`):
```typescript
export { QuickTradeScreen } from './QuickTradeScreen';
export { OrderFormScreen } from './OrderFormScreen';
export { OrderConfirmModal } from './OrderConfirmModal';
export { OrdersHistoryScreen } from './OrdersHistoryScreen';
```

---

### Wallets Folder (`src/screens/wallets/`)

1. **WalletBalancesScreen.tsx**
   - Emoji: 💰
   - Title: Wallet Balances
   - Description: All fiat and crypto wallet balances

2. **DepositFlowScreen.tsx**
   - Emoji: 💸
   - Title: Deposit Flow
   - Description: Deposit via bank transfer, card, or crypto

3. **WithdrawalRequestScreen.tsx**
   - Emoji: 💵
   - Title: Withdrawal Request
   - Description: Withdraw to bank account or crypto address

4. **LinkedBankAccountsScreen.tsx**
   - Emoji: 🏦
   - Title: Linked Bank Accounts
   - Description: Manage connected payment methods

**Index file** (`wallets/index.ts`):
```typescript
export { WalletBalancesScreen } from './WalletBalancesScreen';
export { DepositFlowScreen } from './DepositFlowScreen';
export { WithdrawalRequestScreen } from './WithdrawalRequestScreen';
export { LinkedBankAccountsScreen } from './LinkedBankAccountsScreen';
```

---

### News Folder (`src/screens/news/`)

1. **NewsFeedScreen.tsx**
   - Emoji: 📰
   - Title: News Feed
   - Description: Real-time news with sentiment analysis

2. **AIResearchChatScreen.tsx**
   - Emoji: 🤖
   - Title: AI Research Chat
   - Description: AI-powered market insights and research assistant

**Index file** (`news/index.ts`):
```typescript
export { NewsFeedScreen } from './NewsFeedScreen';
export { AIResearchChatScreen } from './AIResearchChatScreen';
```

---

### Alerts Folder (`src/screens/alerts/`)

1. **AlertsCenterScreen.tsx**
   - Emoji: 🔔
   - Title: Alerts Center
   - Description: Price alerts, notifications, and triggers

2. **AIInsightsCenterScreen.tsx**
   - Emoji: 💡
   - Title: AI Insights Center
   - Description: Personalized AI trading recommendations

**Index file** (`alerts/index.ts`):
```typescript
export { AlertsCenterScreen } from './AlertsCenterScreen';
export { AIInsightsCenterScreen } from './AIInsightsCenterScreen';
```

---

### Profile Folder (`src/screens/profile/`)

1. **ProfileSummaryScreen.tsx**
   - Emoji: 👤
   - Title: Profile Summary
   - Description: User information and verification status

2. **SettingsScreen.tsx**
   - Emoji: ⚙️
   - Title: Settings
   - Description: App preferences, security, notifications

3. **SupportHelpCenterScreen.tsx**
   - Emoji: ❓
   - Title: Support Help Center
   - Description: FAQ, contact support, ticket system

4. **InviteReferScreen.tsx**
   - Emoji: 🎁
   - Title: Invite & Refer
   - Description: Referral program with rewards

**Index file** (`profile/index.ts`):
```typescript
export { ProfileSummaryScreen } from './ProfileSummaryScreen';
export { SettingsScreen } from './SettingsScreen';
export { SupportHelpCenterScreen } from './SupportHelpCenterScreen';
export { InviteReferScreen } from './InviteReferScreen';
```

---

### Misc Folder (`src/screens/misc/`)

1. **OnboardingTipsModal.tsx**
   - Emoji: 💬
   - Title: Onboarding Tips
   - Description: Contextual tips overlay for first-time users

2. **LegalDisclaimersScreen.tsx**
   - Emoji: 📄
   - Title: Legal Disclaimers
   - Description: Terms of service, privacy policy, risk disclosure

3. **MaintenanceScreen.tsx**
   - Emoji: 🔧
   - Title: Maintenance
   - Description: Scheduled maintenance message

4. **BiometricAuthPrompt.tsx**
   - Emoji: 🔐
   - Title: Biometric Auth
   - Description: Fingerprint or Face ID authentication

**Index file** (`misc/index.ts`):
```typescript
export { OnboardingTipsModal } from './OnboardingTipsModal';
export { LegalDisclaimersScreen } from './LegalDisclaimersScreen';
export { MaintenanceScreen } from './MaintenanceScreen';
export { BiometricAuthPrompt } from './BiometricAuthPrompt';
```

---

## ⚡ Quick Copy-Paste Workflow

1. Create the folder (e.g., `kyc/`)
2. For each screen:
   - Copy the template above
   - Replace `[SCREEN_NAME]`, `[EMOJI]`, `[TITLE]`, `[DESCRIPTION]`
   - Save as `ScreenName.tsx`
3. Create the `index.ts` file with exports
4. Repeat for all folders

---

## 🎯 Pro Tips

- Use VS Code's multi-cursor (Alt+Click) to replace multiple occurrences quickly
- Create all files first, then customize content later
- Test one screen per folder to ensure imports work
- Refer to `HomeDashboardScreen.tsx` and `MarketsScreen.tsx` for advanced examples

---

**Time Estimate**: ~30-45 minutes to create all 29 remaining screens using this method
