"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminUser, Notification } from "@/types";

interface AuthState {
  user: AdminUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  notifications: Notification[];
  setUser: (user: AdminUser, token: string) => void;
  logout: () => void;
  setNotifications: (notifications: Notification[]) => void;
  markNotificationRead: (id: string) => void;
  hasPermission: (permission: string) => boolean;
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: [
    "users.view", "users.edit", "users.suspend", "users.ban",
    "kyc.view", "kyc.approve", "kyc.reject",
    "transactions.view", "transactions.export",
    "withdrawals.view", "withdrawals.approve", "withdrawals.reject",
    "risk.view", "risk.edit",
    "reports.view", "reports.generate",
    "settings.view", "settings.edit",
    "logs.view",
    "roles.manage",
  ],
  compliance_officer: [
    "users.view",
    "kyc.view", "kyc.approve", "kyc.reject",
    "transactions.view", "transactions.export",
    "withdrawals.view",
    "risk.view",
    "reports.view", "reports.generate",
    "logs.view",
  ],
  support_admin: [
    "users.view", "users.edit",
    "kyc.view",
    "transactions.view",
    "withdrawals.view",
    "reports.view",
    "logs.view",
  ],
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      notifications: [],
      setUser: (user, token) =>
        set({ user, accessToken: token, isAuthenticated: true }),
      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false, notifications: [] }),
      setNotifications: (notifications) => set({ notifications }),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      hasPermission: (permission) => {
        const user = get().user;
        if (!user) return false;
        return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
      },
    }),
    {
      name: "auth-state",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
