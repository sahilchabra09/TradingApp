/**
 * Mock data for the trading app
 */

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercentage24h: number;
  marketCap: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  icon?: string;
}

export interface Portfolio {
  totalValue: number;
  totalGain: number;
  totalGainPercentage: number;
  holdings: Holding[];
}

export interface Holding {
  assetId: string;
  symbol: string;
  name: string;
  amount: number;
  avgBuyPrice: number;
  currentPrice: number;
  value: number;
  gain: number;
  gainPercentage: number;
}

export interface Trade {
  id: string;
  type: 'buy' | 'sell';
  symbol: string;
  amount: number;
  price: number;
  total: number;
  fee: number;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  timestamp: Date;
}

export interface Order {
  id: string;
  type: 'limit' | 'market' | 'stop-loss' | 'stop-limit';
  side: 'buy' | 'sell';
  symbol: string;
  amount: number;
  price?: number;
  stopPrice?: number;
  status: 'open' | 'filled' | 'partially-filled' | 'cancelled';
  filled: number;
  remaining: number;
  timestamp: Date;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  author?: string;
  url: string;
  image?: string;
  publishedAt: Date;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  relatedAssets?: string[];
}

export interface Alert {
  id: string;
  type: 'price' | 'volume' | 'news' | 'technical';
  title: string;
  message: string;
  symbol?: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface Wallet {
  id: string;
  type: 'fiat' | 'crypto';
  currency: string;
  balance: number;
  availableBalance: number;
  lockedBalance: number;
}

// Mock Assets
export const mockAssets: Asset[] = [
  {
    id: '1',
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 45320.50,
    change24h: 1250.30,
    changePercentage24h: 2.84,
    marketCap: 885000000000,
    volume24h: 28500000000,
    high24h: 46100.00,
    low24h: 44200.00,
  },
  {
    id: '2',
    symbol: 'ETH',
    name: 'Ethereum',
    price: 2845.75,
    change24h: -45.20,
    changePercentage24h: -1.56,
    marketCap: 342000000000,
    volume24h: 15200000000,
    high24h: 2920.00,
    low24h: 2815.00,
  },
  {
    id: '3',
    symbol: 'SOL',
    name: 'Solana',
    price: 98.42,
    change24h: 5.67,
    changePercentage24h: 6.12,
    marketCap: 42000000000,
    volume24h: 1800000000,
    high24h: 101.20,
    low24h: 92.50,
  },
  {
    id: '4',
    symbol: 'ADA',
    name: 'Cardano',
    price: 0.485,
    change24h: 0.012,
    changePercentage24h: 2.54,
    marketCap: 17000000000,
    volume24h: 450000000,
    high24h: 0.492,
    low24h: 0.471,
  },
  {
    id: '5',
    symbol: 'MATIC',
    name: 'Polygon',
    price: 0.875,
    change24h: -0.023,
    changePercentage24h: -2.56,
    marketCap: 8100000000,
    volume24h: 320000000,
    high24h: 0.912,
    low24h: 0.868,
  },
];

// Mock Portfolio
export const mockPortfolio: Portfolio = {
  totalValue: 125430.50,
  totalGain: 12543.20,
  totalGainPercentage: 11.12,
  holdings: [
    {
      assetId: '1',
      symbol: 'BTC',
      name: 'Bitcoin',
      amount: 1.5,
      avgBuyPrice: 42000,
      currentPrice: 45320.50,
      value: 67980.75,
      gain: 4980.75,
      gainPercentage: 7.91,
    },
    {
      assetId: '2',
      symbol: 'ETH',
      name: 'Ethereum',
      amount: 15,
      avgBuyPrice: 2500,
      currentPrice: 2845.75,
      value: 42686.25,
      gain: 5186.25,
      gainPercentage: 13.83,
    },
    {
      assetId: '3',
      symbol: 'SOL',
      name: 'Solana',
      amount: 100,
      avgBuyPrice: 85,
      currentPrice: 98.42,
      value: 9842,
      gain: 1342,
      gainPercentage: 15.79,
    },
  ],
};

// Mock Trades
export const mockTrades: Trade[] = [
  {
    id: '1',
    type: 'buy',
    symbol: 'BTC',
    amount: 0.5,
    price: 45320.50,
    total: 22660.25,
    fee: 45.32,
    status: 'completed',
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: '2',
    type: 'sell',
    symbol: 'ETH',
    amount: 2,
    price: 2845.75,
    total: 5691.50,
    fee: 11.38,
    status: 'completed',
    timestamp: new Date(Date.now() - 7200000),
  },
  {
    id: '3',
    type: 'buy',
    symbol: 'SOL',
    amount: 50,
    price: 98.42,
    total: 4921,
    fee: 9.84,
    status: 'pending',
    timestamp: new Date(Date.now() - 300000),
  },
];

// Mock Orders
export const mockOrders: Order[] = [
  {
    id: '1',
    type: 'limit',
    side: 'buy',
    symbol: 'BTC',
    amount: 0.5,
    price: 44000,
    status: 'open',
    filled: 0,
    remaining: 0.5,
    timestamp: new Date(Date.now() - 3600000),
  },
  {
    id: '2',
    type: 'stop-loss',
    side: 'sell',
    symbol: 'ETH',
    amount: 5,
    stopPrice: 2700,
    status: 'open',
    filled: 0,
    remaining: 5,
    timestamp: new Date(Date.now() - 7200000),
  },
];

// Mock News
export const mockNews: NewsArticle[] = [
  {
    id: '1',
    title: 'Bitcoin Surges Past $45K as Institutional Interest Grows',
    summary: 'Major financial institutions are increasing their Bitcoin holdings...',
    source: 'CryptoNews',
    author: 'John Smith',
    url: 'https://example.com/news/1',
    publishedAt: new Date(Date.now() - 1800000),
    sentiment: 'bullish',
    relatedAssets: ['BTC'],
  },
  {
    id: '2',
    title: 'Ethereum 2.0 Upgrade Shows Promising Results',
    summary: 'The latest network upgrade has significantly reduced gas fees...',
    source: 'BlockchainToday',
    author: 'Jane Doe',
    url: 'https://example.com/news/2',
    publishedAt: new Date(Date.now() - 3600000),
    sentiment: 'bullish',
    relatedAssets: ['ETH'],
  },
  {
    id: '3',
    title: 'Market Analysis: Altcoins Show Mixed Signals',
    summary: 'Technical indicators suggest a period of consolidation ahead...',
    source: 'TradingView',
    url: 'https://example.com/news/3',
    publishedAt: new Date(Date.now() - 7200000),
    sentiment: 'neutral',
  },
];

// Mock Alerts
export const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'price',
    title: 'Price Alert',
    message: 'BTC has crossed $45,000',
    symbol: 'BTC',
    timestamp: new Date(Date.now() - 600000),
    read: false,
    priority: 'high',
  },
  {
    id: '2',
    type: 'technical',
    title: 'Technical Indicator',
    message: 'ETH RSI entering oversold territory',
    symbol: 'ETH',
    timestamp: new Date(Date.now() - 1800000),
    read: false,
    priority: 'medium',
  },
  {
    id: '3',
    type: 'news',
    title: 'Breaking News',
    message: 'Major crypto exchange announces new features',
    timestamp: new Date(Date.now() - 3600000),
    read: true,
    priority: 'low',
  },
];

// Mock Wallets
export const mockWallets: Wallet[] = [
  {
    id: '1',
    type: 'fiat',
    currency: 'USD',
    balance: 50000,
    availableBalance: 48500,
    lockedBalance: 1500,
  },
  {
    id: '2',
    type: 'crypto',
    currency: 'BTC',
    balance: 1.5,
    availableBalance: 1.5,
    lockedBalance: 0,
  },
  {
    id: '3',
    type: 'crypto',
    currency: 'ETH',
    balance: 15,
    availableBalance: 13,
    lockedBalance: 2,
  },
];

// Chart data generator
export const generateChartData = (days: number = 30, basePrice: number = 45000) => {
  const data = [];
  let price = basePrice;
  
  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.5) * basePrice * 0.05;
    price += change;
    
    data.push({
      timestamp: Date.now() - (days - i) * 86400000,
      open: price,
      high: price * (1 + Math.random() * 0.02),
      low: price * (1 - Math.random() * 0.02),
      close: price + (Math.random() - 0.5) * basePrice * 0.01,
      volume: Math.random() * 1000000000,
    });
  }
  
  return data;
};
