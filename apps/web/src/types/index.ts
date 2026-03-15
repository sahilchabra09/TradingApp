// ==================== Auth & Roles ====================
export type AdminRole = "super_admin" | "compliance_officer" | "support_admin";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  avatar?: string;
  lastLogin: string;
  createdAt: string;
}

export interface AuthSession {
  user: AdminUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// ==================== Users ====================
export type KYCStatus = "pending" | "approved" | "rejected" | "not_submitted";
export type AccountStatus = "active" | "suspended" | "banned" | "pending";

export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  country?: string;
  kycStatus: KYCStatus;
  accountStatus: AccountStatus;
  walletBalance: number;
  totalTrades: number;
  totalDeposits: number;
  totalWithdrawals: number;
  registeredAt: string;
  lastActive: string;
  riskScore: number;
  flags: string[];
}

export interface UserTradeHistory {
  id: string;
  asset: string;
  type: "buy" | "sell";
  amount: number;
  price: number;
  total: number;
  status: "completed" | "pending" | "failed" | "cancelled";
  createdAt: string;
}

// ==================== KYC ====================
export type AdminApprovalStatus = "pending_approval" | "approved" | "rejected" | null;

export interface KYCRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  diditSessionId?: string;
  documentType: "passport" | "national_id" | "drivers_license";
  documentFrontUrl: string;
  documentBackUrl?: string;
  selfieUrl: string;
  status: KYCStatus;
  adminApprovalStatus: AdminApprovalStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  auditTrail: AuditEntry[];
}

export interface AuditEntry {
  id: string;
  action: string;
  performedBy: string;
  performedAt: string;
  details?: string;
}

export interface KYCVerificationDetails {
  documentVerified: boolean;
  livenessVerified: boolean;
  faceMatchVerified: boolean;
  documentType?: string;
  documentNumber?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  age?: number;
  gender?: string;
  nationality?: string;
  issuingState?: string;
  expirationDate?: string;
  address?: string;
  frontImage?: string;
  backImage?: string;
  portraitImage?: string;
  selfieImage?: string;
  livenessScore?: number;
  faceMatchScore?: number;
  faceMatchSourceImage?: string;
  faceMatchTargetImage?: string;
  ipCountry?: string;
  ipAddress?: string;
  isVpnOrTor?: boolean;
  deviceBrand?: string;
  deviceModel?: string;
  amlStatus?: string;
  amlHits?: number;
  warnings?: any[];
}

export interface KYCDetail {
  id: string;
  userId: string;
  diditSessionId: string;
  status: string;
  adminApprovalStatus: AdminApprovalStatus;
  adminReviewedAt?: string;
  adminReviewedBy?: string;
  adminRejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userEmail: string;
  verificationDetails?: KYCVerificationDetails | null;
}

// ==================== Transactions ====================
export type TransactionType = "buy" | "sell" | "deposit" | "withdrawal";
export type TransactionStatus = "pending" | "completed" | "failed";

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  type: TransactionType;
  asset: string;
  amount: number;
  price?: number;
  total: number;
  status: TransactionStatus;
  fee: number;
  createdAt: string;
  completedAt?: string;
}

// ==================== Withdrawals ====================
export type WithdrawalStatus = "pending" | "approved" | "rejected" | "flagged" | "processing";

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  bankName: string;
  bankAccountMasked: string;
  status: WithdrawalStatus;
  riskFlags: string[];
  requestedAt: string;
  processedAt?: string;
  processedBy?: string;
  rejectionReason?: string;
}

// ==================== Risk Management ====================
export interface RiskSettings {
  maxTradeSize: number;
  maxLeverage: number;
  maxDailyWithdrawal: number;
  maxExposurePerAsset: number;
  defaultLeverage: number;
  marginCallThreshold: number;
  liquidationThreshold: number;
}

export interface UserRiskOverride {
  userId: string;
  userName: string;
  maxTradeSize?: number;
  maxLeverage?: number;
  maxDailyWithdrawal?: number;
  reason: string;
  setBy: string;
  setAt: string;
}

// ==================== Reports ====================
export type ReportType = "transactions" | "user_activity" | "kyc_audit";
export type ReportFormat = "csv" | "pdf";

export interface ReportRequest {
  type: ReportType;
  format: ReportFormat;
  dateFrom: string;
  dateTo: string;
  filters?: Record<string, string>;
}

// ==================== Dashboard Metrics ====================
export interface DashboardMetrics {
  totalUsers: number;
  verifiedUsers: number;
  pendingKYC: number;
  totalTradingVolume: number;
  platformExposure: number;
  totalDeposits: number;
  totalWithdrawals: number;
  activeTrades: number;
  dailyVolume: { date: string; volume: number }[];
  userGrowth: { date: string; users: number }[];
  assetExposure: { asset: string; value: number; percentage: number }[];
  revenue: { date: string; revenue: number }[];
}

// ==================== Logs ====================
export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  performedByRole: AdminRole;
  targetType: string;
  targetId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

// ==================== Notifications ====================
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  createdAt: string;
}

// ==================== Pagination ====================
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ==================== System Status ====================
export type SystemStatus = "operational" | "degraded" | "down";

export interface SystemHealth {
  status: SystemStatus;
  api: SystemStatus;
  database: SystemStatus;
  trading: SystemStatus;
  lastChecked: string;
}
