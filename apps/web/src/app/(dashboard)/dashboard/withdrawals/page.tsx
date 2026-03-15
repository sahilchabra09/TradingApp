"use client";

import { useState } from "react";
import {
  useWithdrawals,
  useApproveWithdrawal,
  useRejectWithdrawal,
  useFlagWithdrawal,
} from "@/hooks/use-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTablePagination } from "@/components/dashboard/data-table-pagination";
import { CheckCircle, XCircle, Flag, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

const statusConfig = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  approved: { label: "Approved", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  flagged: { label: "Flagged", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  processing: { label: "Processing", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
};

export default function WithdrawalsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data, isLoading } = useWithdrawals({ page, pageSize: 10, status: statusFilter });
  const approveWithdrawal = useApproveWithdrawal();
  const rejectWithdrawal = useRejectWithdrawal();
  const flagWithdrawal = useFlagWithdrawal();

  const handleApprove = () => {
    if (!approveId) return;
    approveWithdrawal.mutate(approveId, {
      onSuccess: () => {
        toast.success("Withdrawal approved");
        setApproveId(null);
      },
      onError: () => toast.error("Failed to approve withdrawal"),
    });
  };

  const handleReject = () => {
    if (!rejectId || !rejectReason.trim()) return;
    rejectWithdrawal.mutate(
      { id: rejectId, reason: rejectReason },
      {
        onSuccess: () => {
          toast.success("Withdrawal rejected");
          setRejectId(null);
          setRejectReason("");
        },
        onError: () => toast.error("Failed to reject withdrawal"),
      }
    );
  };

  const handleFlag = (id: string) => {
    flagWithdrawal.mutate(id, {
      onSuccess: () => toast.success("Withdrawal flagged for review"),
      onError: () => toast.error("Failed to flag withdrawal"),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Withdrawal Approvals</h1>
        <p className="text-sm text-muted-foreground">
          Review and process withdrawal requests
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
              <TableHead className="text-xs">Bank</TableHead>
              <TableHead className="text-xs">Account</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Risk Flags</TableHead>
              <TableHead className="text-xs">Requested</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.data.map((wd) => {
                  const status = statusConfig[wd.status];
                  return (
                    <TableRow key={wd.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{wd.userName}</p>
                          <p className="text-xs text-muted-foreground">{wd.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm font-bold">
                          ${wd.amount.toLocaleString()}
                        </span>
                        <span className="ml-1 text-xs text-muted-foreground">{wd.currency}</span>
                      </TableCell>
                      <TableCell className="text-sm">{wd.bankName}</TableCell>
                      <TableCell className="font-mono text-xs">{wd.bankAccountMasked}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", status.className)}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {wd.riskFlags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {wd.riskFlags.map((flag) => (
                              <Badge key={flag} variant="outline" className="gap-1 text-[10px] bg-red-500/5 text-red-500 border-red-500/20">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                {flag.replace("_", " ")}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(wd.requestedAt), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        {wd.status === "pending" && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-emerald-500 hover:text-emerald-600"
                              onClick={() => setApproveId(wd.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-600"
                              onClick={() => setRejectId(wd.id)}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-orange-500 hover:text-orange-600"
                              onClick={() => handleFlag(wd.id)}
                            >
                              <Flag className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {wd.status !== "pending" && (
                          <span className="text-xs text-muted-foreground">
                            {wd.processedBy || "—"}
                          </span>
                        )}
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

      {/* Approve Confirmation */}
      <AlertDialog open={!!approveId} onOpenChange={() => setApproveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Withdrawal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this withdrawal request? This action will initiate the fund transfer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700">
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={() => { setRejectId(null); setRejectReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this withdrawal.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim()}>
              Reject Withdrawal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
