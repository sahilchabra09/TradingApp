"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/admin.service";
import type { RiskSettingsFormData, UserRiskOverrideFormData } from "@/schemas";

// Dashboard
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: () => adminService.getDashboardMetrics(),
    refetchInterval: 30_000,
  });
}

// Users
export function useUsers(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  kycStatus?: string;
  accountStatus?: string;
}) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => adminService.getUsers(params),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ["user", id],
    queryFn: () => adminService.getUserById(id),
    enabled: !!id,
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.suspendUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useBanUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.banUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useActivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.activateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

// KYC
export function useKYCRequests(params: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: ["kyc-requests", params],
    queryFn: () => adminService.getKYCRequests(params),
  });
}

export function useKYCDetail(sessionId: string | null) {
  return useQuery({
    queryKey: ["kyc-detail", sessionId],
    queryFn: () => adminService.getKYCDetail(sessionId!),
    enabled: !!sessionId,
  });
}

export function useApproveKYC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.approveKYC(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kyc-requests"] }),
  });
}

export function useRejectKYC() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminService.rejectKYC(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kyc-requests"] }),
  });
}

// Transactions
export function useTransactions(params: {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
  search?: string;
  asset?: string;
}) {
  return useQuery({
    queryKey: ["transactions", params],
    queryFn: () => adminService.getTransactions(params),
    refetchInterval: 10_000,
  });
}

// Withdrawals
export function useWithdrawals(params: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  return useQuery({
    queryKey: ["withdrawals", params],
    queryFn: () => adminService.getWithdrawals(params),
  });
}

export function useApproveWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.approveWithdrawal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["withdrawals"] }),
  });
}

export function useRejectWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminService.rejectWithdrawal(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["withdrawals"] }),
  });
}

export function useFlagWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminService.flagWithdrawal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["withdrawals"] }),
  });
}

// Risk Management
export function useRiskSettings() {
  return useQuery({
    queryKey: ["risk-settings"],
    queryFn: () => adminService.getRiskSettings(),
  });
}

export function useUpdateRiskSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: RiskSettingsFormData) =>
      adminService.updateRiskSettings(settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["risk-settings"] }),
  });
}

export function useUserRiskOverrides() {
  return useQuery({
    queryKey: ["risk-overrides"],
    queryFn: () => adminService.getUserRiskOverrides(),
  });
}

export function useCreateUserRiskOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (override: UserRiskOverrideFormData) =>
      adminService.createUserRiskOverride(override),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["risk-overrides"] }),
  });
}

// Audit Logs
export function useAuditLogs(params: {
  page?: number;
  pageSize?: number;
  action?: string;
}) {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => adminService.getAuditLogs(params),
  });
}

// Notifications
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => adminService.getNotifications(),
    refetchInterval: 30_000,
  });
}

// System Health
export function useSystemHealth() {
  return useQuery({
    queryKey: ["system-health"],
    queryFn: () => adminService.getSystemHealth(),
    refetchInterval: 15_000,
  });
}
