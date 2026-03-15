import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const kycReviewSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
});

export const withdrawalActionSchema = z.object({
  action: z.enum(["approved", "rejected", "flagged"]),
  rejectionReason: z.string().optional(),
});

export const riskSettingsSchema = z.object({
  maxTradeSize: z.number().min(0, "Must be positive"),
  maxLeverage: z.number().min(1).max(100),
  maxDailyWithdrawal: z.number().min(0),
  maxExposurePerAsset: z.number().min(0),
  defaultLeverage: z.number().min(1).max(100),
  marginCallThreshold: z.number().min(0).max(100),
  liquidationThreshold: z.number().min(0).max(100),
});

export const userRiskOverrideSchema = z.object({
  userId: z.string(),
  maxTradeSize: z.number().min(0).optional(),
  maxLeverage: z.number().min(1).max(100).optional(),
  maxDailyWithdrawal: z.number().min(0).optional(),
  reason: z.string().min(1, "Reason is required"),
});

export const reportRequestSchema = z.object({
  type: z.enum(["transactions", "user_activity", "kyc_audit"]),
  format: z.enum(["csv", "pdf"]),
  dateFrom: z.string(),
  dateTo: z.string(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type KYCReviewFormData = z.infer<typeof kycReviewSchema>;
export type WithdrawalActionFormData = z.infer<typeof withdrawalActionSchema>;
export type RiskSettingsFormData = z.infer<typeof riskSettingsSchema>;
export type UserRiskOverrideFormData = z.infer<typeof userRiskOverrideSchema>;
export type ReportRequestFormData = z.infer<typeof reportRequestSchema>;
