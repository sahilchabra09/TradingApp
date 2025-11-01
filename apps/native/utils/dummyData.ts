// Comprehensive dummy data for the trading app

export interface Stock {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  category: 'stock' | 'crypto' | 'forex';
  exchange: string;
  high24h?: number;
  low24h?: number;
  open?: number;
}

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  totalValue: number;
  change: number;
  changePercent: number;
  sparklineData: number[];
  category: 'stock' | 'crypto' | 'cash';
}

export interface ChartDataPoint {
  date: string;
  value: number;
  timestamp?: number;
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'deposit' | 'withdrawal';
  symbol?: string;
  name?: string;
  quantity?: number;
  price?: number;
  total: number;
  status: 'filled' | 'pending' | 'cancelled';
  timestamp: string;
  date: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  image?: string;
  summary: string;
}

export interface PriceAlert {
  id: string;
  symbol: string;
  name: string;
  targetPrice: number;
  currentPrice: number;
  direction: 'above' | 'below';
  progress: number;
  changePercent: number;
  triggered: boolean;
  triggeredAt?: string;
}

// Generate realistic price movements
const generateSparkline = (basePrice: number, points: number = 20): number[] => {
  const data: number[] = [];
  let price = basePrice;
  
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.5) * (basePrice * 0.02);
    price = price + change;
    data.push(Number(price.toFixed(2)));
  }
  
  return data;
};

// Generate candlestick data
const generateCandles = (
  basePrice: number,
  count: number,
  interval: number = 3600000 // 1 hour in ms
): CandleData[] => {
  const candles: CandleData[] = [];
  let currentPrice = basePrice;
  const now = Date.now();

  for (let i = count - 1; i >= 0; i--) {
    const open = currentPrice;
    const volatility = basePrice * 0.02;
    const change = (Math.random() - 0.5) * volatility;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * volatility * 0.5;
    const low = Math.min(open, close) - Math.random() * volatility * 0.5;
    const volume = Math.floor(Math.random() * 10000000) + 1000000;

    candles.unshift({
      timestamp: now - i * interval,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    currentPrice = close;
  }

  return candles;
};

// Stocks data
export const stocks: Stock[] = [
  {
    id: '1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 189.45,
    change: 4.35,
    changePercent: 2.35,
    volume: '48.5M',
    marketCap: '2.94T',
    category: 'stock',
    exchange: 'NASDAQ',
    high24h: 190.15,
    low24h: 186.80,
    open: 187.20,
  },
  {
    id: '2',
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    price: 142.65,
    change: 2.52,
    changePercent: 1.80,
    volume: '22.3M',
    marketCap: '1.78T',
    category: 'stock',
    exchange: 'NASDAQ',
    high24h: 143.20,
    low24h: 140.10,
    open: 140.50,
  },
  {
    id: '3',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    price: 378.91,
    change: -1.89,
    changePercent: -0.50,
    volume: '18.7M',
    marketCap: '2.82T',
    category: 'stock',
    exchange: 'NASDAQ',
    high24h: 381.50,
    low24h: 377.20,
    open: 380.80,
  },
  {
    id: '4',
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    price: 242.84,
    change: 18.42,
    changePercent: 8.20,
    volume: '125.8M',
    marketCap: '771.2B',
    category: 'stock',
    exchange: 'NASDAQ',
    high24h: 245.60,
    low24h: 224.42,
    open: 224.42,
  },
  {
    id: '5',
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    price: 178.35,
    change: 3.21,
    changePercent: 1.83,
    volume: '41.2M',
    marketCap: '1.85T',
    category: 'stock',
    exchange: 'NASDAQ',
    high24h: 179.50,
    low24h: 175.14,
    open: 175.14,
  },
  {
    id: '6',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    price: 495.22,
    change: 19.08,
    changePercent: 4.01,
    volume: '52.3M',
    marketCap: '1.22T',
    category: 'stock',
    exchange: 'NASDAQ',
    high24h: 498.50,
    low24h: 476.14,
    open: 476.14,
  },
  {
    id: '7',
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    price: 486.53,
    change: 14.20,
    changePercent: 3.01,
    volume: '15.8M',
    marketCap: '1.24T',
    category: 'stock',
    exchange: 'NASDAQ',
    high24h: 489.00,
    low24h: 472.33,
    open: 472.33,
  },
  {
    id: '8',
    symbol: 'BTC',
    name: 'Bitcoin',
    price: 42156.78,
    change: -642.32,
    changePercent: -1.50,
    volume: '28.5B',
    marketCap: '823.4B',
    category: 'crypto',
    exchange: 'Crypto',
    high24h: 43200.00,
    low24h: 41800.00,
    open: 42799.10,
  },
  {
    id: '9',
    symbol: 'ETH',
    name: 'Ethereum',
    price: 2234.56,
    change: 45.32,
    changePercent: 2.07,
    volume: '12.3B',
    marketCap: '268.5B',
    category: 'crypto',
    exchange: 'Crypto',
    high24h: 2250.00,
    low24h: 2180.00,
    open: 2189.24,
  },
  {
    id: '10',
    symbol: 'GME',
    name: 'GameStop Corp.',
    price: 24.50,
    change: 1.50,
    changePercent: 6.52,
    volume: '8.2M',
    marketCap: '7.4B',
    category: 'stock',
    exchange: 'NYSE',
    high24h: 25.00,
    low24h: 23.00,
    open: 23.00,
  },
  {
    id: '11',
    symbol: 'AMC',
    name: 'AMC Entertainment',
    price: 8.45,
    change: 0.40,
    changePercent: 4.97,
    volume: '12.5M',
    marketCap: '4.3B',
    category: 'stock',
    exchange: 'NYSE',
    high24h: 8.60,
    low24h: 8.05,
    open: 8.05,
  },
  {
    id: '12',
    symbol: 'NFLX',
    name: 'Netflix Inc.',
    price: 612.80,
    change: -5.20,
    changePercent: -0.84,
    volume: '3.2M',
    marketCap: '263.2B',
    category: 'stock',
    exchange: 'NASDAQ',
    high24h: 620.00,
    low24h: 610.00,
    open: 618.00,
  },
  {
    id: '13',
    symbol: 'DIS',
    name: 'The Walt Disney Company',
    price: 95.67,
    change: 1.23,
    changePercent: 1.30,
    volume: '8.9M',
    marketCap: '175.2B',
    category: 'stock',
    exchange: 'NYSE',
    high24h: 96.50,
    low24h: 94.44,
    open: 94.44,
  },
  {
    id: '14',
    symbol: 'BA',
    name: 'Boeing Company',
    price: 178.45,
    change: -2.35,
    changePercent: -1.30,
    volume: '6.7M',
    marketCap: '109.3B',
    category: 'stock',
    exchange: 'NYSE',
    high24h: 182.00,
    low24h: 177.80,
    open: 180.80,
  },
  {
    id: '15',
    symbol: 'COIN',
    name: 'Coinbase Global Inc.',
    price: 156.78,
    change: 8.92,
    changePercent: 6.03,
    volume: '11.2M',
    marketCap: '38.5B',
    category: 'stock',
    exchange: 'NASDAQ',
    high24h: 158.90,
    low24h: 147.86,
    open: 147.86,
  },
  {
    id: '16',
    symbol: 'PYPL',
    name: 'PayPal Holdings Inc.',
    price: 62.34,
    change: 1.12,
    changePercent: 1.83,
    volume: '9.8M',
    marketCap: '68.2B',
    category: 'stock',
    exchange: 'NASDAQ',
    high24h: 63.00,
    low24h: 61.22,
    open: 61.22,
  },
  {
    id: '17',
    symbol: 'SQ',
    name: 'Block Inc.',
    price: 78.90,
    change: 2.45,
    changePercent: 3.20,
    volume: '7.3M',
    marketCap: '45.8B',
    category: 'stock',
    exchange: 'NYSE',
    high24h: 79.50,
    low24h: 76.45,
    open: 76.45,
  },
  {
    id: '18',
    symbol: 'SHOP',
    name: 'Shopify Inc.',
    price: 89.23,
    change: -1.67,
    changePercent: -1.84,
    volume: '5.6M',
    marketCap: '112.4B',
    category: 'stock',
    exchange: 'NYSE',
    high24h: 91.50,
    low24h: 88.90,
    open: 90.90,
  },
  {
    id: '19',
    symbol: 'UBER',
    name: 'Uber Technologies Inc.',
    price: 72.45,
    change: 3.21,
    changePercent: 4.63,
    volume: '18.9M',
    marketCap: '148.3B',
    category: 'stock',
    exchange: 'NYSE',
    high24h: 73.00,
    low24h: 69.24,
    open: 69.24,
  },
  {
    id: '20',
    symbol: 'SPOT',
    name: 'Spotify Technology SA',
    price: 234.56,
    change: 5.67,
    changePercent: 2.48,
    volume: '2.1M',
    marketCap: '47.2B',
    category: 'stock',
    exchange: 'NYSE',
    high24h: 236.00,
    low24h: 228.89,
    open: 228.89,
  },
  {
    id: '21',
    symbol: 'ABNB',
    name: 'Airbnb Inc.',
    price: 145.67,
    change: -2.34,
    changePercent: -1.58,
    volume: '4.5M',
    marketCap: '93.8B',
    category: 'stock',
    exchange: 'NASDAQ',
    high24h: 149.00,
    low24h: 145.01,
    open: 148.01,
  },
  {
    id: '22',
    symbol: 'RBLX',
    name: 'Roblox Corporation',
    price: 42.89,
    change: 1.98,
    changePercent: 4.84,
    volume: '16.7M',
    marketCap: '27.3B',
    category: 'stock',
    exchange: 'NYSE',
    high24h: 43.50,
    low24h: 40.91,
    open: 40.91,
  },
  {
    id: '23',
    symbol: 'AMD',
    name: 'Advanced Micro Devices',
    price: 156.78,
    change: 4.23,
    changePercent: 2.77,
    volume: '62.8M',
    marketCap: '253.7B',
    category: 'stock',
    exchange: 'NASDAQ',
    high24h: 158.00,
    low24h: 152.55,
    open: 152.55,
  },
  {
    id: '24',
    symbol: 'INTC',
    name: 'Intel Corporation',
    price: 34.56,
    change: -0.78,
    changePercent: -2.21,
    volume: '38.9M',
    marketCap: '142.8B',
    category: 'stock',
    exchange: 'NASDAQ',
    high24h: 35.70,
    low24h: 34.34,
    open: 35.34,
  },
  {
    id: '25',
    symbol: 'BABA',
    name: 'Alibaba Group Holding',
    price: 78.90,
    change: 2.10,
    changePercent: 2.73,
    volume: '18.4M',
    marketCap: '198.5B',
    category: 'stock',
    exchange: 'NYSE',
    high24h: 79.50,
    low24h: 76.80,
    open: 76.80,
  },
  {
    id: '26',
    symbol: 'SOL',
    name: 'Solana',
    price: 89.45,
    change: 3.67,
    changePercent: 4.28,
    volume: '2.1B',
    marketCap: '39.2B',
    category: 'crypto',
    exchange: 'Crypto',
    high24h: 91.00,
    low24h: 85.78,
    open: 85.78,
  },
  {
    id: '27',
    symbol: 'ADA',
    name: 'Cardano',
    price: 0.56,
    change: 0.02,
    changePercent: 3.70,
    volume: '456.7M',
    marketCap: '19.7B',
    category: 'crypto',
    exchange: 'Crypto',
    high24h: 0.58,
    low24h: 0.54,
    open: 0.54,
  },
  {
    id: '28',
    symbol: 'DOGE',
    name: 'Dogecoin',
    price: 0.089,
    change: 0.004,
    changePercent: 4.71,
    volume: '823.4M',
    marketCap: '12.6B',
    category: 'crypto',
    exchange: 'Crypto',
    high24h: 0.091,
    low24h: 0.085,
    open: 0.085,
  },
  {
    id: '29',
    symbol: 'AVAX',
    name: 'Avalanche',
    price: 34.56,
    change: -1.23,
    changePercent: -3.44,
    volume: '389.2M',
    marketCap: '13.4B',
    category: 'crypto',
    exchange: 'Crypto',
    high24h: 36.50,
    low24h: 34.10,
    open: 35.79,
  },
  {
    id: '30',
    symbol: 'MATIC',
    name: 'Polygon',
    price: 0.78,
    change: 0.03,
    changePercent: 4.00,
    volume: '567.8M',
    marketCap: '7.2B',
    category: 'crypto',
    exchange: 'Crypto',
    high24h: 0.80,
    low24h: 0.75,
    open: 0.75,
  },
];

// User holdings
export const userHoldings: Holding[] = [
  {
    id: '1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    quantity: 10,
    averagePrice: 175.30,
    currentPrice: 189.45,
    totalValue: 1894.50,
    change: 141.50,
    changePercent: 8.07,
    sparklineData: generateSparkline(189.45),
    category: 'stock',
  },
  {
    id: '2',
    symbol: 'BTC',
    name: 'Bitcoin',
    quantity: 0.5,
    averagePrice: 38000.00,
    currentPrice: 42156.78,
    totalValue: 21078.39,
    change: 2078.39,
    changePercent: 10.94,
    sparklineData: generateSparkline(42156.78),
    category: 'crypto',
  },
  {
    id: '3',
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    quantity: 5,
    averagePrice: 220.50,
    currentPrice: 242.84,
    totalValue: 1214.20,
    change: 111.70,
    changePercent: 10.13,
    sparklineData: generateSparkline(242.84),
    category: 'stock',
  },
  {
    id: '4',
    symbol: 'ETH',
    name: 'Ethereum',
    quantity: 3,
    averagePrice: 2100.00,
    currentPrice: 2234.56,
    totalValue: 6703.68,
    change: 403.68,
    changePercent: 6.41,
    sparklineData: generateSparkline(2234.56),
    category: 'crypto',
  },
  {
    id: '5',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    quantity: 8,
    averagePrice: 450.00,
    currentPrice: 495.22,
    totalValue: 3961.76,
    change: 361.76,
    changePercent: 10.05,
    sparklineData: generateSparkline(495.22),
    category: 'stock',
  },
  {
    id: 'cash',
    symbol: 'USD',
    name: 'Available Cash',
    quantity: 1,
    averagePrice: 12456.78,
    currentPrice: 12456.78,
    totalValue: 12456.78,
    change: 0,
    changePercent: 0,
    sparklineData: [],
    category: 'cash',
  },
];

// Portfolio chart data (last 30 days)
export const portfolioChartData: ChartDataPoint[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  const baseValue = 43000;
  const variance = Math.sin(i / 5) * 2000 + (Math.random() - 0.5) * 1000;
  
  return {
    date: date.toISOString().split('T')[0],
    value: Number((baseValue + variance + (i * 75)).toFixed(2)),
    timestamp: date.getTime(),
  };
});

// Transaction history
export const transactions: Transaction[] = [
  {
    id: '1',
    type: 'buy',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    quantity: 10,
    price: 189.45,
    total: 1894.50,
    status: 'filled',
    timestamp: '11:30 AM',
    date: 'Today',
  },
  {
    id: '2',
    type: 'sell',
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    quantity: 5,
    price: 242.84,
    total: 1214.20,
    status: 'filled',
    timestamp: '09:15 AM',
    date: 'Today',
  },
  {
    id: '3',
    type: 'deposit',
    total: 5000.00,
    status: 'filled',
    timestamp: '3:45 PM',
    date: 'Yesterday',
  },
  {
    id: '4',
    type: 'buy',
    symbol: 'BTC',
    name: 'Bitcoin',
    quantity: 0.25,
    price: 42156.78,
    total: 10539.20,
    status: 'filled',
    timestamp: '2:20 PM',
    date: 'Yesterday',
  },
  {
    id: '5',
    type: 'buy',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    quantity: 8,
    price: 495.22,
    total: 3961.76,
    status: 'filled',
    timestamp: '10:05 AM',
    date: 'Yesterday',
  },
  {
    id: '6',
    type: 'sell',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    quantity: 15,
    price: 378.91,
    total: 5683.65,
    status: 'filled',
    timestamp: '4:30 PM',
    date: 'Nov 30',
  },
  {
    id: '7',
    type: 'withdrawal',
    total: 2000.00,
    status: 'pending',
    timestamp: '1:15 PM',
    date: 'Nov 30',
  },
  {
    id: '8',
    type: 'buy',
    symbol: 'ETH',
    name: 'Ethereum',
    quantity: 3,
    price: 2234.56,
    total: 6703.68,
    status: 'filled',
    timestamp: '11:20 AM',
    date: 'Nov 29',
  },
];

// News articles
export const newsArticles: NewsArticle[] = [
  {
    id: '1',
    title: 'Apple announces new product lineup with AI features',
    source: 'Bloomberg',
    timestamp: '2 hours ago',
    summary: 'Apple Inc. unveiled a new range of products powered by advanced AI capabilities...',
  },
  {
    id: '2',
    title: 'Bitcoin reaches new milestone amid institutional adoption',
    source: 'CoinDesk',
    timestamp: '4 hours ago',
    summary: 'Bitcoin hit a significant price level as more institutional investors enter the market...',
  },
  {
    id: '3',
    title: 'Tesla surpasses delivery expectations in Q4',
    source: 'Reuters',
    timestamp: '6 hours ago',
    summary: 'Tesla reported higher than expected vehicle deliveries for the fourth quarter...',
  },
  {
    id: '4',
    title: 'NVIDIA announces breakthrough in AI chip technology',
    source: 'TechCrunch',
    timestamp: '8 hours ago',
    summary: 'NVIDIA revealed its next-generation AI processors with unprecedented performance...',
  },
  {
    id: '5',
    title: 'Federal Reserve signals potential rate adjustment',
    source: 'WSJ',
    timestamp: '1 day ago',
    summary: 'The Federal Reserve hinted at possible changes to interest rates in upcoming meetings...',
  },
];

// Price alerts
export const priceAlerts: PriceAlert[] = [
  {
    id: '1',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    targetPrice: 200.00,
    currentPrice: 189.45,
    direction: 'above',
    progress: 67,
    changePercent: 5.57,
    triggered: false,
  },
  {
    id: '2',
    symbol: 'BTC',
    name: 'Bitcoin',
    targetPrice: 40000.00,
    currentPrice: 42156.78,
    direction: 'below',
    progress: 15,
    changePercent: -5.12,
    triggered: false,
  },
  {
    id: '3',
    symbol: 'TSLA',
    name: 'Tesla, Inc.',
    targetPrice: 250.00,
    currentPrice: 242.84,
    direction: 'above',
    progress: 85,
    changePercent: 2.95,
    triggered: false,
  },
  {
    id: '4',
    symbol: 'NVDA',
    name: 'NVIDIA Corporation',
    targetPrice: 250.00,
    currentPrice: 495.22,
    direction: 'above',
    progress: 100,
    changePercent: 98.09,
    triggered: true,
    triggeredAt: '2 hours ago',
  },
];

// Generate candle data for different assets
export const generateCandleData = (symbol: string, timeframe: '1m' | '5m' | '15m' | '1h' | '1D' | '1W' | '1M' = '1h'): CandleData[] => {
  const stock = stocks.find((s) => s.symbol === symbol);
  const basePrice = stock?.price || 100;
  
  const intervals = {
    '1m': { count: 60, interval: 60000 },
    '5m': { count: 72, interval: 300000 },
    '15m': { count: 96, interval: 900000 },
    '1h': { count: 168, interval: 3600000 },
    '1D': { count: 90, interval: 86400000 },
    '1W': { count: 52, interval: 604800000 },
    '1M': { count: 24, interval: 2592000000 },
  };
  
  const { count, interval } = intervals[timeframe];
  return generateCandles(basePrice, count, interval);
};

// Get top movers
export const getTopMovers = (type: 'gainers' | 'losers' = 'gainers'): Stock[] => {
  const sorted = [...stocks].sort((a, b) => 
    type === 'gainers' 
      ? b.changePercent - a.changePercent 
      : a.changePercent - b.changePercent
  );
  return sorted.slice(0, 10);
};

// Filter stocks by category
export const getStocksByCategory = (category: 'all' | 'stock' | 'crypto' | 'forex'): Stock[] => {
  if (category === 'all') return stocks;
  return stocks.filter((s) => s.category === category);
};

// Calculate portfolio metrics
export const calculatePortfolioMetrics = () => {
  const totalValue = userHoldings.reduce((sum, holding) => sum + holding.totalValue, 0);
  const totalCost = userHoldings.reduce(
    (sum, holding) => sum + holding.quantity * holding.averagePrice,
    0
  );
  const totalChange = totalValue - totalCost;
  const totalChangePercent = (totalChange / totalCost) * 100;
  
  // Calculate today's change (simulated)
  const todayChange = totalValue * 0.028;
  const todayChangePercent = 2.8;
  
  return {
    totalValue: Number(totalValue.toFixed(2)),
    totalChange: Number(totalChange.toFixed(2)),
    totalChangePercent: Number(totalChangePercent.toFixed(2)),
    todayChange: Number(todayChange.toFixed(2)),
    todayChangePercent,
    cashBalance: userHoldings.find((h) => h.symbol === 'USD')?.totalValue || 0,
  };
};

export const portfolioMetrics = calculatePortfolioMetrics();
