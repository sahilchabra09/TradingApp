"use client";

import { useState } from "react";
import { useUsers, useSuspendUser, useBanUser, useActivateUser } from "@/hooks/use-admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { DataTablePagination } from "@/components/dashboard/data-table-pagination";
import { Search, ShieldCheck, ShieldX, ShieldAlert, ShieldQuestion, Ban, UserX, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformUser } from "@/types";
import { format } from "date-fns";
import { toast } from "sonner";

const kycBadge = {
  approved: { label: "Approved", variant: "default" as const, icon: ShieldCheck, className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  pending: { label: "Pending", variant: "secondary" as const, icon: ShieldAlert, className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  rejected: { label: "Rejected", variant: "destructive" as const, icon: ShieldX, className: "bg-red-500/10 text-red-500 border-red-500/20" },
  not_submitted: { label: "Not Submitted", variant: "outline" as const, icon: ShieldQuestion, className: "bg-muted text-muted-foreground" },
};

const statusBadge = {
  active: { label: "Active", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  suspended: { label: "Suspended", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  banned: { label: "Banned", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  pending: { label: "Pending", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
};

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);

  const { data, isLoading } = useUsers({
    page,
    pageSize: 10,
    search,
    kycStatus: kycFilter,
    accountStatus: statusFilter,
  });

  const suspendUser = useSuspendUser();
  const banUser = useBanUser();
  const activateUser = useActivateUser();

  const handleSuspend = (id: string) => {
    suspendUser.mutate(id, {
      onSuccess: () => toast.success("User suspended successfully"),
      onError: () => toast.error("Failed to suspend user"),
    });
  };

  const handleBan = (id: string) => {
    banUser.mutate(id, {
      onSuccess: () => toast.success("User banned successfully"),
      onError: () => toast.error("Failed to ban user"),
    });
  };

  const handleActivate = (id: string) => {
    activateUser.mutate(id, {
      onSuccess: () => toast.success("User activated successfully"),
      onError: () => toast.error("Failed to activate user"),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">
          View and manage platform users
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={kycFilter} onValueChange={(v) => { setKycFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="KYC Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All KYC</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="not_submitted">Not Submitted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Account Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs">KYC</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs text-right">Balance</TableHead>
              <TableHead className="text-xs text-right">Trades</TableHead>
              <TableHead className="text-xs">Registered</TableHead>
              <TableHead className="text-xs">Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.data.map((user) => {
                  const kyc = kycBadge[user.kycStatus];
                  const status = statusBadge[user.accountStatus];
                  return (
                    <TableRow
                      key={user.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedUser(user)}
                    >
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", kyc.className)}>
                          {kyc.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", status.className)}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ${user.walletBalance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {user.totalTrades}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(user.registeredAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                          user.riskScore > 70 ? "bg-red-500/10 text-red-500" :
                          user.riskScore > 40 ? "bg-amber-500/10 text-amber-500" :
                          "bg-emerald-500/10 text-emerald-500"
                        )}>
                          {user.riskScore}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>

        {data && (
          <DataTablePagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            pageSize={data.pageSize}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* User Detail Drawer */}
      <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedUser && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedUser.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Profile Information</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium">{selectedUser.phone || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Country</p>
                      <p className="font-medium">{selectedUser.country || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">User ID</p>
                      <p className="font-mono text-xs">{selectedUser.id}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Account Status</h4>
                  <div className="flex gap-2">
                    <Badge variant="outline" className={cn("text-xs", kycBadge[selectedUser.kycStatus].className)}>
                      KYC: {kycBadge[selectedUser.kycStatus].label}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs", statusBadge[selectedUser.accountStatus].className)}>
                      {statusBadge[selectedUser.accountStatus].label}
                    </Badge>
                  </div>
                  {selectedUser.flags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedUser.flags.map((flag) => (
                        <Badge key={flag} variant="destructive" className="text-[10px]">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Financial Summary</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Wallet Balance</p>
                      <p className="text-lg font-bold">${selectedUser.walletBalance.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Total Trades</p>
                      <p className="text-lg font-bold">{selectedUser.totalTrades}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Total Deposits</p>
                      <p className="text-lg font-bold">${selectedUser.totalDeposits.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Total Withdrawals</p>
                      <p className="text-lg font-bold">${selectedUser.totalWithdrawals.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Risk Score</h4>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold",
                      selectedUser.riskScore > 70 ? "bg-red-500/10 text-red-500" :
                      selectedUser.riskScore > 40 ? "bg-amber-500/10 text-amber-500" :
                      "bg-emerald-500/10 text-emerald-500"
                    )}>
                      {selectedUser.riskScore}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {selectedUser.riskScore > 70 ? "High Risk" :
                         selectedUser.riskScore > 40 ? "Medium Risk" : "Low Risk"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Last active: {format(new Date(selectedUser.lastActive), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex gap-2">
                  {selectedUser.accountStatus === "active" ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-amber-500 hover:text-amber-600"
                        onClick={() => handleSuspend(selectedUser.id)}
                      >
                        <UserX className="mr-2 h-4 w-4" />
                        Suspend
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleBan(selectedUser.id)}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        Ban
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-emerald-500 hover:text-emerald-600"
                      onClick={() => handleActivate(selectedUser.id)}
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      Activate
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
