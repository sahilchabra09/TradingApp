"use client";

import { useState } from "react";
import { useAuditLogs } from "@/hooks/use-admin";
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
import { DataTablePagination } from "@/components/dashboard/data-table-pagination";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const roleBadge = {
  super_admin: { label: "Super Admin", className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  compliance_officer: { label: "Compliance", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  support_admin: { label: "Support", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
};

const actionColors: Record<string, string> = {
  "User Login": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "KYC Approved": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "KYC Rejected": "bg-red-500/10 text-red-500 border-red-500/20",
  "Withdrawal Approved": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  "Withdrawal Rejected": "bg-red-500/10 text-red-500 border-red-500/20",
  "Risk Settings Updated": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "User Suspended": "bg-orange-500/10 text-orange-500 border-orange-500/20",
  "Report Generated": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "User Banned": "bg-red-500/10 text-red-500 border-red-500/20",
  "Settings Changed": "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");

  const { data, isLoading } = useAuditLogs({ page, pageSize: 15, action: actionFilter });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          Track all administrative actions and system events
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="User Login">User Login</SelectItem>
            <SelectItem value="KYC Approved">KYC Approved</SelectItem>
            <SelectItem value="KYC Rejected">KYC Rejected</SelectItem>
            <SelectItem value="Withdrawal Approved">Withdrawal Approved</SelectItem>
            <SelectItem value="Withdrawal Rejected">Withdrawal Rejected</SelectItem>
            <SelectItem value="Risk Settings Updated">Risk Settings Updated</SelectItem>
            <SelectItem value="User Suspended">User Suspended</SelectItem>
            <SelectItem value="User Banned">User Banned</SelectItem>
            <SelectItem value="Report Generated">Report Generated</SelectItem>
            <SelectItem value="Settings Changed">Settings Changed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">Timestamp</TableHead>
              <TableHead className="text-xs">Action</TableHead>
              <TableHead className="text-xs">Performed By</TableHead>
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="text-xs">Target</TableHead>
              <TableHead className="text-xs">Details</TableHead>
              <TableHead className="text-xs">IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 15 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.data.map((log) => {
                  const role = roleBadge[log.performedByRole];
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.timestamp), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            actionColors[log.action] || "bg-muted text-muted-foreground"
                          )}
                        >
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {log.performedBy}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", role.className)}>
                          {role.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-xs capitalize">{log.targetType}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{log.targetId}</p>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="truncate text-xs text-muted-foreground">{log.details}</p>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.ipAddress}
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
    </div>
  );
}
