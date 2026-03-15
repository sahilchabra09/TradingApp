import type {
  DashboardMetrics,
  PlatformUser,
  KYCRequest,
  Transaction,
  WithdrawalRequest,
  RiskSettings,
  AuditLog,
  Notification,
  SystemHealth,
  UserRiskOverride,
} from "@/types";

// ==================== Dashboard Metrics ====================
export const mockDashboardMetrics: DashboardMetrics = {
  totalUsers: 12847,
  verifiedUsers: 9632,
  pendingKYC: 234,
  totalTradingVolume: 45_230_000,
  platformExposure: 12_450_000,
  totalDeposits: 28_900_000,
  totalWithdrawals: 15_200_000,
  activeTrades: 1847,
  dailyVolume: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0]!,
    volume: Math.floor(Math.random() * 2_000_000) + 500_000,
  })),
  userGrowth: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0]!,
    users: Math.floor(12000 + i * 30 + Math.random() * 50),
  })),
  assetExposure: [
    { asset: "BTC", value: 4_500_000, percentage: 36.1 },
    { asset: "ETH", value: 3_200_000, percentage: 25.7 },
    { asset: "USDT", value: 2_100_000, percentage: 16.9 },
    { asset: "SOL", value: 1_400_000, percentage: 11.2 },
    { asset: "Others", value: 1_250_000, percentage: 10.1 },
  ],
  revenue: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0]!,
    revenue: Math.floor(Math.random() * 50_000) + 10_000,
  })),
};

// ==================== Users ====================
const names = [
  "Alice Johnson", "Bob Smith", "Charlie Brown", "Diana Prince", "Edward Norton",
  "Fiona Apple", "George Lucas", "Hannah Montana", "Ivan Drago", "Julia Roberts",
  "Kevin Hart", "Laura Palmer", "Michael Scott", "Nancy Drew", "Oscar Wilde",
  "Patricia Arquette", "Quentin Blake", "Rachel Green", "Steve Rogers", "Tina Turner",
];

const countries = ["US", "UK", "MU", "IN", "DE", "FR", "JP", "AU", "CA", "SG"];

export const mockUsers: PlatformUser[] = Array.from({ length: 50 }, (_, i) => ({
  id: `usr_${String(i + 1).padStart(4, "0")}`,
  email: `${names[i % names.length]!.toLowerCase().replace(" ", ".")}${i > 19 ? i : ""}@example.com`,
  name: names[i % names.length]!,
  phone: `+1${String(Math.floor(Math.random() * 9000000000) + 1000000000)}`,
  country: countries[i % countries.length],
  kycStatus: (["approved", "pending", "rejected", "not_submitted"] as const)[i % 4],
  accountStatus: (["active", "active", "active", "suspended"] as const)[i % 4],
  walletBalance: Math.floor(Math.random() * 100_000),
  totalTrades: Math.floor(Math.random() * 500),
  totalDeposits: Math.floor(Math.random() * 200_000),
  totalWithdrawals: Math.floor(Math.random() * 100_000),
  registeredAt: new Date(Date.now() - Math.floor(Math.random() * 365 * 86400000)).toISOString(),
  lastActive: new Date(Date.now() - Math.floor(Math.random() * 7 * 86400000)).toISOString(),
  riskScore: Math.floor(Math.random() * 100),
  flags: i % 7 === 0 ? ["high_volume", "multiple_withdrawals"] : [],
}));

// ==================== KYC Requests ====================
export const mockKYCRequests: KYCRequest[] = Array.from({ length: 20 }, (_, i) => ({
  id: `kyc_${String(i + 1).padStart(4, "0")}`,
  userId: `usr_${String(i + 1).padStart(4, "0")}`,
  userName: names[i % names.length]!,
  userEmail: `${names[i % names.length]!.toLowerCase().replace(" ", ".")}@example.com`,
  documentType: (["passport", "national_id", "drivers_license"] as const)[i % 3],
  documentFrontUrl: "/placeholder-doc.png",
  documentBackUrl: i % 3 !== 0 ? "/placeholder-doc-back.png" : undefined,
  selfieUrl: "/placeholder-selfie.png",
  status: (["pending", "pending", "approved", "rejected"] as const)[i % 4],
  adminApprovalStatus: (["pending_approval", "pending_approval", "approved", "rejected"] as const)[i % 4] as any,
  submittedAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 86400000)).toISOString(),
  reviewedAt: i % 4 >= 2 ? new Date(Date.now() - Math.floor(Math.random() * 2 * 86400000)).toISOString() : undefined,
  reviewedBy: i % 4 >= 2 ? "Admin User" : undefined,
  rejectionReason: i % 4 === 3 ? "Document not clearly visible" : undefined,
  auditTrail: [
    {
      id: `audit_${i}_1`,
      action: "KYC Submitted",
      performedBy: names[i % names.length]!,
      performedAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 86400000)).toISOString(),
    },
  ],
}));

// ==================== Transactions ====================
const assets = ["BTC", "ETH", "USDT", "SOL", "ADA", "DOT", "AVAX", "MATIC"];

export const mockTransactions: Transaction[] = Array.from({ length: 100 }, (_, i) => {
  const type = (["buy", "sell", "deposit", "withdrawal"] as const)[i % 4];
  const amount = Math.floor(Math.random() * 10_000) + 100;
  const price = type === "buy" || type === "sell" ? Math.floor(Math.random() * 50_000) + 100 : undefined;
  return {
    id: `txn_${String(i + 1).padStart(5, "0")}`,
    userId: `usr_${String((i % 50) + 1).padStart(4, "0")}`,
    userName: names[i % names.length]!,
    type,
    asset: assets[i % assets.length]!,
    amount,
    price,
    total: price ? amount * price : amount,
    status: (["completed", "completed", "pending", "failed"] as const)[i % 4],
    fee: Math.floor(amount * 0.001),
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * 86400000)).toISOString(),
    completedAt: i % 4 < 2 ? new Date(Date.now() - Math.floor(Math.random() * 29 * 86400000)).toISOString() : undefined,
  };
});

// ==================== Withdrawals ====================
export const mockWithdrawals: WithdrawalRequest[] = Array.from({ length: 25 }, (_, i) => ({
  id: `wd_${String(i + 1).padStart(4, "0")}`,
  userId: `usr_${String((i % 50) + 1).padStart(4, "0")}`,
  userName: names[i % names.length]!,
  userEmail: `${names[i % names.length]!.toLowerCase().replace(" ", ".")}@example.com`,
  amount: Math.floor(Math.random() * 50_000) + 500,
  currency: "USD",
  bankName: ["Chase", "Bank of America", "Wells Fargo", "Citibank", "HSBC"][i % 5]!,
  bankAccountMasked: `****${String(Math.floor(Math.random() * 9000) + 1000)}`,
  status: (["pending", "pending", "approved", "rejected", "flagged"] as const)[i % 5],
  riskFlags: i % 3 === 0 ? ["large_amount", "new_account"] : [],
  requestedAt: new Date(Date.now() - Math.floor(Math.random() * 7 * 86400000)).toISOString(),
  processedAt: i % 5 >= 2 ? new Date(Date.now() - Math.floor(Math.random() * 2 * 86400000)).toISOString() : undefined,
  processedBy: i % 5 >= 2 ? "Admin User" : undefined,
  rejectionReason: i % 5 === 3 ? "Suspicious activity detected" : undefined,
}));

// ==================== Risk Settings ====================
export const mockRiskSettings: RiskSettings = {
  maxTradeSize: 100_000,
  maxLeverage: 20,
  maxDailyWithdrawal: 50_000,
  maxExposurePerAsset: 500_000,
  defaultLeverage: 5,
  marginCallThreshold: 80,
  liquidationThreshold: 95,
};

export const mockUserRiskOverrides: UserRiskOverride[] = [
  {
    userId: "usr_0001",
    userName: "Alice Johnson",
    maxTradeSize: 200_000,
    maxLeverage: 30,
    reason: "VIP client with proven track record",
    setBy: "Super Admin",
    setAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    userId: "usr_0005",
    userName: "Edward Norton",
    maxDailyWithdrawal: 10_000,
    reason: "Flagged for suspicious activity - reduced limits",
    setBy: "Compliance Officer",
    setAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

// ==================== Audit Logs ====================
export const mockAuditLogs: AuditLog[] = Array.from({ length: 50 }, (_, i) => ({
  id: `log_${String(i + 1).padStart(5, "0")}`,
  action: [
    "User Login", "KYC Approved", "KYC Rejected", "Withdrawal Approved",
    "Withdrawal Rejected", "Risk Settings Updated", "User Suspended",
    "Report Generated", "User Banned", "Settings Changed",
  ][i % 10]!,
  performedBy: ["Super Admin", "Compliance Officer", "Support Admin"][i % 3]!,
  performedByRole: (["super_admin", "compliance_officer", "support_admin"] as const)[i % 3],
  targetType: ["user", "kyc", "withdrawal", "settings", "report"][i % 5]!,
  targetId: `target_${i + 1}`,
  details: `Action performed on ${["user account", "KYC request", "withdrawal", "platform settings", "compliance report"][i % 5]}`,
  ipAddress: `192.168.1.${(i % 254) + 1}`,
  timestamp: new Date(Date.now() - i * 3600000).toISOString(),
}));

// ==================== Notifications ====================
export const mockNotifications: Notification[] = [
  { id: "n1", title: "New KYC Request", message: "Alice Johnson submitted KYC documents", type: "info", read: false, createdAt: new Date(Date.now() - 300000).toISOString() },
  { id: "n2", title: "Large Withdrawal", message: "Bob Smith requested $45,000 withdrawal", type: "warning", read: false, createdAt: new Date(Date.now() - 600000).toISOString() },
  { id: "n3", title: "Risk Alert", message: "Platform exposure exceeding 80% threshold", type: "error", read: false, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: "n4", title: "Report Ready", message: "Monthly compliance report generated", type: "success", read: true, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "n5", title: "System Update", message: "Scheduled maintenance at 2:00 AM UTC", type: "info", read: true, createdAt: new Date(Date.now() - 7200000).toISOString() },
];

// ==================== System Health ====================
export const mockSystemHealth: SystemHealth = {
  status: "operational",
  api: "operational",
  database: "operational",
  trading: "operational",
  lastChecked: new Date().toISOString(),
};
