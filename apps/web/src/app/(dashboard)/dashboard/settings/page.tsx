"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Users,
  Settings,
  CheckCircle,
  XCircle,
} from "lucide-react";
import type { AdminRole } from "@/types";

interface RolePermission {
  permission: string;
  label: string;
  category: string;
  superAdmin: boolean;
  complianceOfficer: boolean;
  supportAdmin: boolean;
}

const rolePermissions: RolePermission[] = [
  { permission: "users.view", label: "View Users", category: "Users", superAdmin: true, complianceOfficer: true, supportAdmin: true },
  { permission: "users.edit", label: "Edit Users", category: "Users", superAdmin: true, complianceOfficer: false, supportAdmin: true },
  { permission: "users.suspend", label: "Suspend Users", category: "Users", superAdmin: true, complianceOfficer: false, supportAdmin: false },
  { permission: "users.ban", label: "Ban Users", category: "Users", superAdmin: true, complianceOfficer: false, supportAdmin: false },
  { permission: "kyc.view", label: "View KYC", category: "KYC", superAdmin: true, complianceOfficer: true, supportAdmin: true },
  { permission: "kyc.approve", label: "Approve KYC", category: "KYC", superAdmin: true, complianceOfficer: true, supportAdmin: false },
  { permission: "kyc.reject", label: "Reject KYC", category: "KYC", superAdmin: true, complianceOfficer: true, supportAdmin: false },
  { permission: "transactions.view", label: "View Transactions", category: "Transactions", superAdmin: true, complianceOfficer: true, supportAdmin: true },
  { permission: "transactions.export", label: "Export Transactions", category: "Transactions", superAdmin: true, complianceOfficer: true, supportAdmin: false },
  { permission: "withdrawals.view", label: "View Withdrawals", category: "Withdrawals", superAdmin: true, complianceOfficer: true, supportAdmin: true },
  { permission: "withdrawals.approve", label: "Approve Withdrawals", category: "Withdrawals", superAdmin: true, complianceOfficer: false, supportAdmin: false },
  { permission: "withdrawals.reject", label: "Reject Withdrawals", category: "Withdrawals", superAdmin: true, complianceOfficer: false, supportAdmin: false },
  { permission: "risk.view", label: "View Risk Settings", category: "Risk", superAdmin: true, complianceOfficer: true, supportAdmin: false },
  { permission: "risk.edit", label: "Edit Risk Settings", category: "Risk", superAdmin: true, complianceOfficer: false, supportAdmin: false },
  { permission: "reports.view", label: "View Reports", category: "Reports", superAdmin: true, complianceOfficer: true, supportAdmin: true },
  { permission: "reports.generate", label: "Generate Reports", category: "Reports", superAdmin: true, complianceOfficer: true, supportAdmin: false },
  { permission: "settings.view", label: "View Settings", category: "Settings", superAdmin: true, complianceOfficer: false, supportAdmin: false },
  { permission: "settings.edit", label: "Edit Settings", category: "Settings", superAdmin: true, complianceOfficer: false, supportAdmin: false },
  { permission: "logs.view", label: "View Audit Logs", category: "Logs", superAdmin: true, complianceOfficer: true, supportAdmin: true },
  { permission: "roles.manage", label: "Manage Roles", category: "Admin", superAdmin: true, complianceOfficer: false, supportAdmin: false },
];

const roleConfig: Record<AdminRole, { label: string; description: string; color: string }> = {
  super_admin: {
    label: "Super Admin",
    description: "Full access to all platform features and settings",
    color: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  },
  compliance_officer: {
    label: "Compliance Officer",
    description: "KYC verification, transaction monitoring, and report generation",
    color: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  support_admin: {
    label: "Support Admin",
    description: "User management and basic platform monitoring",
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
};

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings & Roles</h1>
        <p className="text-sm text-muted-foreground">
          Manage admin roles, permissions, and platform settings
        </p>
      </div>

      {/* Role Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(Object.entries(roleConfig) as [AdminRole, typeof roleConfig[AdminRole]][]).map(
          ([role, config]) => (
            <div
              key={role}
              className="rounded-xl border border-border/50 bg-card/80 p-5 backdrop-blur-sm"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  {role === "super_admin" ? (
                    <Shield className="h-5 w-5 text-primary" />
                  ) : role === "compliance_officer" ? (
                    <Settings className="h-5 w-5 text-primary" />
                  ) : (
                    <Users className="h-5 w-5 text-primary" />
                  )}
                </div>
                <Badge variant="outline" className={config.color}>
                  {config.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{config.description}</p>
              <p className="mt-3 text-xs font-medium">
                {rolePermissions.filter((p) => {
                  if (role === "super_admin") return p.superAdmin;
                  if (role === "compliance_officer") return p.complianceOfficer;
                  return p.supportAdmin;
                }).length}{" "}
                permissions
              </p>
            </div>
          )
        )}
      </div>

      {/* Permissions Matrix */}
      <div className="rounded-xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-semibold">Permissions Matrix</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs">Permission</TableHead>
                <TableHead className="text-xs text-center">Super Admin</TableHead>
                <TableHead className="text-xs text-center">Compliance Officer</TableHead>
                <TableHead className="text-xs text-center">Support Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rolePermissions.map((perm) => (
                <TableRow key={perm.permission}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{perm.label}</p>
                      <p className="text-[10px] text-muted-foreground">{perm.category}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {perm.superAdmin ? (
                      <CheckCircle className="mx-auto h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="mx-auto h-4 w-4 text-muted-foreground/30" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {perm.complianceOfficer ? (
                      <CheckCircle className="mx-auto h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="mx-auto h-4 w-4 text-muted-foreground/30" />
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {perm.supportAdmin ? (
                      <CheckCircle className="mx-auto h-4 w-4 text-emerald-500" />
                    ) : (
                      <XCircle className="mx-auto h-4 w-4 text-muted-foreground/30" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Separator />

      {/* Platform Settings */}
      <div className="rounded-xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm">
        <h2 className="mb-6 text-lg font-semibold">Platform Settings</h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Maintenance Mode</Label>
              <p className="text-xs text-muted-foreground">
                Disable trading and user access during maintenance
              </p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">New User Registration</Label>
              <p className="text-xs text-muted-foreground">
                Allow new users to register on the platform
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Auto KYC Verification</Label>
              <p className="text-xs text-muted-foreground">
                Enable automated KYC document verification via Didit
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Send email alerts for critical platform events
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Two-Factor Authentication</Label>
              <p className="text-xs text-muted-foreground">
                Require 2FA for all admin accounts
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}
