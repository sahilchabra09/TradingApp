/**
 * Script to generate all remaining trading app screens
 * Run this to create the complete screen structure
 */

import * as fs from 'fs';
import * as path from 'path';

const screensConfig = {
  kyc: [
    {
      name: 'KYCStartScreen',
      description: 'Introduction to KYC process with steps overview',
      emoji: '📋',
    },
    {
      name: 'DocumentCaptureScreen',
      description: 'Camera interface for ID/Passport capture',
      emoji: '📸',
    },
    {
      name: 'NFCVerificationScreen',
      description: 'NFC chip scanning for passport verification',
      emoji: '📱',
    },
    {
      name: 'FaceMatchScreen',
      description: 'Liveness detection and face matching',
      emoji: '🤳',
    },
    {
      name: 'KYCStatusScreen',
      description: 'KYC review status with progress tracker',
      emoji: '✅',
    },
  ],
  home: [
    {
      name: 'PortfolioDetailScreen',
      description: 'Detailed holdings breakdown with performance charts',
      emoji: '📊',
    },
  ],
  markets: [
    {
      name: 'MarketsScreen',
      description: 'Discover all assets with search, filter, and sorting',
      emoji: '🔍',
    },
    {
      name: 'AssetDetailScreen',
      description: 'Price chart, order book, recent trades, buy/sell actions',
      emoji: '📈',
    },
    {
      name: 'WatchlistManagementScreen',
      description: 'Manage favorite assets and custom lists',
      emoji: '⭐',
    },
  ],
  trade: [
    {
      name: 'QuickTradeScreen',
      description: 'Simple buy/sell interface with market orders',
      emoji: '⚡',
    },
    {
      name: 'OrderFormScreen',
      description: 'Advanced order types: limit, stop-loss, stop-limit',
      emoji: '📝',
    },
    {
      name: 'OrderConfirmModal',
      description: 'Review order details before submission',
      emoji: '✔️',
    },
    {
      name: 'OrdersHistoryScreen',
      description: 'All orders: open, filled, partially filled, cancelled',
      emoji: '📜',
    },
  ],
  wallets: [
    {
      name: 'WalletBalancesScreen',
      description: 'All fiat and crypto wallet balances',
      emoji: '💰',
    },
    {
      name: 'DepositFlowScreen',
      description: 'Deposit via bank transfer, card, or crypto',
      emoji: '💸',
    },
    {
      name: 'WithdrawalRequestScreen',
      description: 'Withdraw to bank account or crypto address',
      emoji: '💵',
    },
    {
      name: 'LinkedBankAccountsScreen',
      description: 'Manage connected payment methods',
      emoji: '🏦',
    },
  ],
  news: [
    {
      name: 'NewsFeedScreen',
      description: 'Real-time news with sentiment analysis',
      emoji: '📰',
    },
    {
      name: 'AIResearchChatScreen',
      description: 'AI-powered market insights and research assistant',
      emoji: '🤖',
    },
  ],
  alerts: [
    {
      name: 'AlertsCenterScreen',
      description: 'Price alerts, notifications, and triggers',
      emoji: '🔔',
    },
    {
      name: 'AIInsightsCenterScreen',
      description: 'Personalized AI trading recommendations',
      emoji: '💡',
    },
  ],
  profile: [
    {
      name: 'ProfileSummaryScreen',
      description: 'User information and verification status',
      emoji: '👤',
    },
    {
      name: 'SettingsScreen',
      description: 'App preferences, security, notifications',
      emoji: '⚙️',
    },
    {
      name: 'SupportHelpCenterScreen',
      description: 'FAQ, contact support, ticket system',
      emoji: '❓',
    },
    {
      name: 'InviteReferScreen',
      description: 'Referral program with rewards',
      emoji: '🎁',
    },
  ],
  misc: [
    {
      name: 'OnboardingTipsModal',
      description: 'Contextual tips overlay for first-time users',
      emoji: '💬',
    },
    {
      name: 'LegalDisclaimersScreen',
      description: 'Terms of service, privacy policy, risk disclosure',
      emoji: '📄',
    },
    {
      name: 'MaintenanceScreen',
      description: 'Scheduled maintenance message',
      emoji: '🔧',
    },
    {
      name: 'BiometricAuthPrompt',
      description: 'Fingerprint or Face ID authentication',
      emoji: '🔐',
    },
  ],
};

const generateScreenTemplate = (
  name: string,
  description: string,
  emoji: string
): string => {
  return `/**
 * ${name}
 * ${description}
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../utils/hooks';
import { GradientBackground, Button, Card } from '../../components';

export const ${name}: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  return (
    <GradientBackground>
      <ScrollView
        style={[styles.container, { padding: theme.spacing.base }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.emoji}>${emoji}</Text>
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
            ${name.replace('Screen', '').replace(/([A-Z])/g, ' $1').trim()}
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
            ${description}
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
`;
};

const generateIndexFile = (folder: string, screens: any[]): string => {
  const exports = screens.map((s) => `export { ${s.name} } from './${s.name}';`).join('\n');
  return `/**
 * ${folder.charAt(0).toUpperCase() + folder.slice(1)} Screens
 */

${exports}
`;
};

// Generate all screens
Object.entries(screensConfig).forEach(([folder, screens]) => {
  const folderPath = path.join(__dirname, '..', 'screens', folder);
  
  // Create folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  // Generate each screen
  screens.forEach(({ name, description, emoji }) => {
    const filePath = path.join(folderPath, `${name}.tsx`);
    const content = generateScreenTemplate(name, description, emoji);
    fs.writeFileSync(filePath, content);
    console.log(`✅ Created: ${folder}/${name}.tsx`);
  });

  // Generate index file
  const indexPath = path.join(folderPath, 'index.ts');
  const indexContent = generateIndexFile(folder, screens);
  fs.writeFileSync(indexPath, indexContent);
  console.log(`✅ Created: ${folder}/index.ts`);
});

console.log('\n🎉 All screens generated successfully!');
