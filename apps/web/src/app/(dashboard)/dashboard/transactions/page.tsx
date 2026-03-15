"use client";

import { useState } from "react";
import { useTransactions } from "@/hooks/use-admin";
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
import { DataTablePagination } from "@/components/dashboard/data-table-pagination";
import { Search, Download, ArrowUpRight, ArrowDownRight, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

const typeConfig = {
  buy: { label: "Buy", icon: ArrowUpRight, className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  sell: { label: "Sell", icon: ArrowDownRight, className: "bg-red-500/10 text-red-500 border-red-500/20" },
  deposit: { label: "Deposit", icon: ArrowDownToLine, className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpFromLine, className: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
};

const statusConfig = {
  completed: { label: "Completed", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  failed: { label: "Failed", className: "bg-red-500/10 text-red-500 border-red-500/20" },
};

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assetFilter, setAssetFilter] = useState("all");

  const { data, isLoading } = useTransactions({
    page,
    pageSize: 10,
    search,
    type: typeFilter,
    status: statusFilter,
    asset: assetFilter,
  });

  const handleExportCSV = () => {
    if (!data?.data) return;
    const headers = ["ID", "User", "Type", "Asset", "Amount", "Price", "Total", "Fee", "Status", "Date"];
    const rows = data.data.map((t) => [
      t.id, t.userName, t.type, t.asset, t.amount, t.price ?? "", t.total, t.fee, t.status,
      format(new Date(t.createdAt), "yyyy-MM-dd HH:mm"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Monitor all platform transactions in real-time
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by user or transaction ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="buy">Buy</SelectItem>
            <SelectItem value="sell">Sell</SelectItem>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="withdrawal">Withdrawal</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assetFilter} onValueChange={(v) => { setAssetFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Asset" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assets</SelectItem>
            <SelectItem value="BTC">BTC</SelectItem>
            <SelectItem value="ETH">ETH</SelectItem>
            <SelectItem value="USDT">USDT</SelectItem>
            <SelectItem value="SOL">SOL</SelectItem>
            <SelectItem value="ADA">ADA</SelectItem>
            <SelectItem value="DOT">DOT</SelectItem>
            <SelectItem value="AVAX">AVAX</SelectItem>
            <SelectItem value="MATIC">MATIC</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">ID</TableHead>
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Asset</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="text-xs text-right">Fee</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.data.map((txn) => {
                  const type = typeConfig[txn.type];
                  const status = statusConfig[txn.status];
                  const TypeIcon = type.icon;
                  return (
                    <TableRow key={txn.id}>
                      <TableCell className="font-mono text-xs">{txn.id}</TableCell>
                      <TableCell className="text-sm">{txn.userName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1 text-[10px]", type.className)}>
                          <TypeIcon className="h-3 w-3" />
                          {type.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{txn.asset}</TableCell>
                      <TableCell className="text-right text-sm">{txn.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ${txn.total.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        ${txn.fee.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", status.className)}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(txn.createdAt), "MMM d, HH:mm")}
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
