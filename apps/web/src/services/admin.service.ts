import { api } from "@/lib/api";
import {
  mockDashboardMetrics,
  mockTransactions,
  mockWithdrawals,
  mockRiskSettings,
  mockUserRiskOverrides,
  mockAuditLogs,
  mockNotifications,
  mockSystemHealth,
} from "@/lib/mock-data";
import type {
  DashboardMetrics,
  PlatformUser,
  KYCRequest,
  Transaction,
  WithdrawalRequest,
  RiskSettings,
  UserRiskOverride,
  AuditLog,
  Notification,
  SystemHealth,
  PaginatedResponse,
} from "@/types";
import type { KYCStatus, AccountStatus } from "@/types";
import type { RiskSettingsFormData, UserRiskOverrideFormData } from "@/schemas";

// Helper: server wraps responses in { success, data: { data, pagination } }
interface ServerPaginatedResponse<T> {
  success: boolean;
  data: {
    data: T[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

interface ServerResponse<T> {
  success: boolean;
  data: T;
}

function paginate<T>(data: T[], page: number, pageSize: number): PaginatedResponse<T> {
  const total = data.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  return {
    data: data.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

// Map server KYC status enums to frontend types
function mapKycStatus(serverStatus: string): KYCStatus {
  switch (serverStatus) {
    case "approved": return "approved";
    case "pending": return "pending";
    case "rejected": return "rejected";
    case "not_started": return "not_submitted";
    case "resubmission_required": return "rejected";
    default: return "not_submitted";
  }
}

function mapAccountStatus(serverStatus: string): AccountStatus {
  switch (serverStatus) {
    case "active": return "active";
    case "suspended": return "suspended";
    case "closed": return "banned";
    case "pending_kyc": return "pending";
    default: return "pending";
  }
}

function mapKycSessionStatus(serverStatus: string): KYCStatus {
  switch (serverStatus) {
    case "approved": return "approved";
    case "declined": return "rejected";
    case "pending": return "pending";
    case "expired": return "rejected";
    case "abandoned": return "rejected";
    default: return "pending";
  }
}

export const adminService = {
  // Dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const res = await api.get<ServerResponse<{
        totalUsers: number;
        verifiedUsers: number;
        pendingKYC: number;
        activeUsers: number;
      }>>("/api/v1/admin/stats");
      // Merge real stats into mock dashboard metrics for charts (charts still use mock data)
      return {
        ...mockDashboardMetrics,
        totalUsers: res.data.totalUsers,
        verifiedUsers: res.data.verifiedUsers,
        pendingKYC: res.data.pendingKYC,
      };
    } catch {
      return mockDashboardMetrics;
    }
  },

  // Users — connected to real backend
  async getUsers(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    kycStatus?: string;
    accountStatus?: string;
  }): Promise<PaginatedResponse<PlatformUser>> {
    try {
      const queryParams: Record<string, string> = {
        page: String(params.page ?? 1),
        pageSize: String(params.pageSize ?? 10),
      };
      if (params.search) queryParams.search = params.search;
      if (params.kycStatus && params.kycStatus !== "all") queryParams.kycStatus = params.kycStatus;
      if (params.accountStatus && params.accountStatus !== "all") queryParams.accountStatus = params.accountStatus;

      const res = await api.get<ServerPaginatedResponse<any>>("/api/v1/admin/users", queryParams);

      const mapped: PlatformUser[] = res.data.data.map((u: any) => ({
        id: u.id,
        email: u.email,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
        phone: u.phoneNumber || undefined,
        country: u.nationality || undefined,
        kycStatus: mapKycStatus(u.kycStatus),
        accountStatus: mapAccountStatus(u.accountStatus),
        walletBalance: 0,
        totalTrades: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        registeredAt: u.createdAt,
        lastActive: u.lastLoginAt || u.createdAt,
        riskScore: u.riskProfile === "aggressive" ? 75 : u.riskProfile === "moderate" ? 45 : 20,
        flags: u.accountStatus === "suspended" ? ["suspended"] : [],
      }));

      return {
        data: mapped,
        total: res.data.pagination.total,
        page: res.data.pagination.page,
        pageSize: res.data.pagination.pageSize,
        totalPages: res.data.pagination.totalPages,
      };
    } catch (err) {
      console.error("Failed to fetch users from backend:", err);
      return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
    }
  },

  async getUserById(id: string): Promise<PlatformUser | undefined> {
    try {
      const res = await api.get<ServerResponse<any>>(`/api/v1/admin/users/${id}`);
      const u = res.data;
      return {
        id: u.id,
        email: u.email,
        name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
        phone: u.phoneNumber || undefined,
        country: u.nationality || undefined,
        kycStatus: mapKycStatus(u.kycStatus),
        accountStatus: mapAccountStatus(u.accountStatus),
        walletBalance: 0,
        totalTrades: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        registeredAt: u.createdAt,
        lastActive: u.lastLoginAt || u.createdAt,
        riskScore: u.riskProfile === "aggressive" ? 75 : u.riskProfile === "moderate" ? 45 : 20,
        flags: u.accountStatus === "suspended" ? ["suspended"] : [],
      };
    } catch {
      return undefined;
    }
  },

  async suspendUser(id: string): Promise<void> {
    await api.post(`/api/v1/admin/users/${id}/suspend`);
  },

  async banUser(id: string): Promise<void> {
    await api.post(`/api/v1/admin/users/${id}/ban`);
  },

  async activateUser(id: string): Promise<void> {
    await api.post(`/api/v1/admin/users/${id}/activate`);
  },

  // KYC — connected to real backend
  async getKYCRequests(params: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<PaginatedResponse<KYCRequest>> {
    try {
      const queryParams: Record<string, string> = {
        page: String(params.page ?? 1),
        pageSize: String(params.pageSize ?? 10),
      };
      if (params.status && params.status !== "all") queryParams.status = params.status;

      const res = await api.get<ServerPaginatedResponse<any>>("/api/v1/admin/kyc", queryParams);

      const mapped: KYCRequest[] = res.data.data.map((s: any) => ({
        id: s.id,
        userId: s.userId,
        userName: s.userName || "Unknown",
        userEmail: s.userEmail || "Unknown",
        diditSessionId: s.diditSessionId,
        documentType: "passport" as const,
        documentFrontUrl: "",
        selfieUrl: "",
        status: mapKycSessionStatus(s.status),
        adminApprovalStatus: s.adminApprovalStatus || null,
        submittedAt: s.createdAt,
        reviewedAt: s.status !== "pending" ? s.updatedAt : undefined,
        auditTrail: [{
          id: `audit_${s.id}`,
          action: "KYC Session Created",
          performedBy: s.userName || "User",
          performedAt: s.createdAt,
        }],
      }));

      return {
        data: mapped,
        total: res.data.pagination.total,
        page: res.data.pagination.page,
        pageSize: res.data.pagination.pageSize,
        totalPages: res.data.pagination.totalPages,
      };
    } catch (err) {
      console.error("Failed to fetch KYC requests from backend:", err);
      return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
    }
  },

  async getKYCDetail(sessionId: string): Promise<import("@/types").KYCDetail | null> {
    try {
      const res = await api.get<ServerResponse<any>>(`/api/v1/admin/kyc/${sessionId}`);
      const s = res.data;
      return {
        id: s.id,
        userId: s.userId,
        diditSessionId: s.diditSessionId,
        status: s.status,
        adminApprovalStatus: s.adminApprovalStatus || null,
        adminReviewedAt: s.adminReviewedAt,
        adminReviewedBy: s.adminReviewedBy,
        adminRejectionReason: s.adminRejectionReason,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        userName: s.userName || "Unknown",
        userEmail: s.userEmail || "Unknown",
        verificationDetails: s.verificationDetails || null,
      };
    } catch (err) {
      console.error("Failed to fetch KYC detail:", err);
      return null;
    }
  },

  async approveKYC(id: string): Promise<void> {
    await api.post(`/api/v1/admin/kyc/${id}/approve`);
  },

  async rejectKYC(id: string, reason: string): Promise<void> {
    await api.post(`/api/v1/admin/kyc/${id}/reject`, { reason });
  },

  // Transactions (mock — no backend route yet)
  async getTransactions(params: {
    page?: number;
    pageSize?: number;
    type?: string;
    status?: string;
    search?: string;
    asset?: string;
  }): Promise<PaginatedResponse<Transaction>> {
    let filtered = [...mockTransactions];
    if (params.type && params.type !== "all") {
      filtered = filtered.filter((t) => t.type === params.type);
    }
    if (params.status && params.status !== "all") {
      filtered = filtered.filter((t) => t.status === params.status);
    }
    if (params.asset && params.asset !== "all") {
      filtered = filtered.filter((t) => t.asset === params.asset);
    }
    if (params.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter((t) => t.userName.toLowerCase().includes(s) || t.id.includes(s));
    }
    return paginate(filtered, params.page ?? 1, params.pageSize ?? 10);
  },

  // Withdrawals (mock — no backend route yet)
  async getWithdrawals(params: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<PaginatedResponse<WithdrawalRequest>> {
    let filtered = [...mockWithdrawals];
    if (params.status && params.status !== "all") {
      filtered = filtered.filter((w) => w.status === params.status);
    }
    return paginate(filtered, params.page ?? 1, params.pageSize ?? 10);
  },

  async approveWithdrawal(_id: string): Promise<void> { return; },
  async rejectWithdrawal(_id: string, _reason: string): Promise<void> { return; },
  async flagWithdrawal(_id: string): Promise<void> { return; },

  // Risk Management (mock — no backend route yet)
  async getRiskSettings(): Promise<RiskSettings> { return mockRiskSettings; },
  async updateRiskSettings(_settings: RiskSettingsFormData): Promise<void> { return; },
  async getUserRiskOverrides(): Promise<UserRiskOverride[]> { return mockUserRiskOverrides; },
  async createUserRiskOverride(_override: UserRiskOverrideFormData): Promise<void> { return; },

  // Reports (mock)
  async generateReport(_params: {
    type: string;
    format: string;
    dateFrom: string;
    dateTo: string;
  }): Promise<Blob> {
    return new Blob(["Mock report data"], { type: "text/csv" });
  },

  // Audit Logs (mock — no backend route yet)
  async getAuditLogs(params: {
    page?: number;
    pageSize?: number;
    action?: string;
  }): Promise<PaginatedResponse<AuditLog>> {
    let filtered = [...mockAuditLogs];
    if (params.action && params.action !== "all") {
      filtered = filtered.filter((l) => l.action === params.action);
    }
    return paginate(filtered, params.page ?? 1, params.pageSize ?? 10);
  },

  // Notifications (mock)
  async getNotifications(): Promise<Notification[]> { return mockNotifications; },

  // System Health (mock)
  async getSystemHealth(): Promise<SystemHealth> { return mockSystemHealth; },
};
