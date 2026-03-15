"use client";

import { useDashboardMetrics } from "@/hooks/use-admin";
import { MetricCard } from "@/components/dashboard/metric-card";
import { VolumeChart } from "@/components/charts/volume-chart";
import { UserGrowthChart } from "@/components/charts/user-growth-chart";
import { AssetExposureChart } from "@/components/charts/asset-exposure-chart";
import { RevenueChart } from "@/components/charts/revenue-chart";
import {
  Users,
  ShieldCheck,
  Clock,
  TrendingUp,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
} from "lucide-react";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value}`;
}

export default function DashboardPage() {
  const { data: metrics, isLoading } = useDashboardMetrics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-sm text-muted-foreground">
          Real-time platform metrics and analytics
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={metrics?.totalUsers.toLocaleString() ?? "—"}
          change="+12.5% from last month"
          changeType="positive"
          icon={Users}
          loading={isLoading}
        />
        <MetricCard
          title="Verified Users"
          value={metrics?.verifiedUsers.toLocaleString() ?? "—"}
          change={`${metrics ? ((metrics.verifiedUsers / metrics.totalUsers) * 100).toFixed(1) : 0}% verification rate`}
          changeType="positive"
          icon={ShieldCheck}
          loading={isLoading}
        />
        <MetricCard
          title="Pending KYC"
          value={metrics?.pendingKYC.toLocaleString() ?? "—"}
          change="Requires attention"
          changeType="negative"
          icon={Clock}
          loading={isLoading}
        />
        <MetricCard
          title="Trading Volume"
          value={metrics ? formatCurrency(metrics.totalTradingVolume) : "—"}
          change="+8.2% from last week"
          changeType="positive"
          icon={TrendingUp}
          loading={isLoading}
        />
        <MetricCard
          title="Platform Exposure"
          value={metrics ? formatCurrency(metrics.platformExposure) : "—"}
          change="Within safe limits"
          changeType="neutral"
          icon={AlertTriangle}
          loading={isLoading}
        />
        <MetricCard
          title="Total Deposits"
          value={metrics ? formatCurrency(metrics.totalDeposits) : "—"}
          change="+15.3% from last month"
          changeType="positive"
          icon={ArrowDownToLine}
          loading={isLoading}
        />
        <MetricCard
          title="Total Withdrawals"
          value={metrics ? formatCurrency(metrics.totalWithdrawals) : "—"}
          change="+5.1% from last month"
          changeType="neutral"
          icon={ArrowUpFromLine}
          loading={isLoading}
        />
        <MetricCard
          title="Active Trades"
          value={metrics?.activeTrades.toLocaleString() ?? "—"}
          change="Live positions"
          changeType="neutral"
          icon={Activity}
          loading={isLoading}
        />
      </div>

      {metrics && (
        <div className="grid gap-4 lg:grid-cols-2">
          <VolumeChart data={metrics.dailyVolume} />
          <UserGrowthChart data={metrics.userGrowth} />
          <AssetExposureChart data={metrics.assetExposure} />
          <RevenueChart data={metrics.revenue} />
        </div>
      )}
    </div>
  );
}
