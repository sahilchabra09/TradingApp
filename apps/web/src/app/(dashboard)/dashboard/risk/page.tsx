"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useRiskSettings,
  useUpdateRiskSettings,
  useUserRiskOverrides,
} from "@/hooks/use-admin";
import { riskSettingsSchema, type RiskSettingsFormData } from "@/schemas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Save, AlertTriangle, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function RiskManagementPage() {
  const { data: settings, isLoading } = useRiskSettings();
  const updateSettings = useUpdateRiskSettings();
  const { data: overrides = [] } = useUserRiskOverrides();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<RiskSettingsFormData>({
    resolver: zodResolver(riskSettingsSchema),
  });

  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const onSubmit = (data: RiskSettingsFormData) => {
    updateSettings.mutate(data, {
      onSuccess: () => toast.success("Risk settings updated successfully"),
      onError: () => toast.error("Failed to update risk settings"),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Risk Management</h1>
        <p className="text-sm text-muted-foreground">
          Configure platform-wide risk parameters and user-specific limits
        </p>
      </div>

      {/* Global Risk Settings */}
      <div className="rounded-xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Global Risk Settings</h2>
            <p className="text-xs text-muted-foreground">
              These settings apply to all users unless overridden
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="maxTradeSize" className="text-xs">
                Max Trade Size ($)
              </Label>
              <Input
                id="maxTradeSize"
                type="number"
                {...register("maxTradeSize", { valueAsNumber: true })}
              />
              {errors.maxTradeSize && (
                <p className="text-xs text-destructive">{errors.maxTradeSize.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxLeverage" className="text-xs">
                Max Leverage (x)
              </Label>
              <Input
                id="maxLeverage"
                type="number"
                {...register("maxLeverage", { valueAsNumber: true })}
              />
              {errors.maxLeverage && (
                <p className="text-xs text-destructive">{errors.maxLeverage.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultLeverage" className="text-xs">
                Default Leverage (x)
              </Label>
              <Input
                id="defaultLeverage"
                type="number"
                {...register("defaultLeverage", { valueAsNumber: true })}
              />
              {errors.defaultLeverage && (
                <p className="text-xs text-destructive">{errors.defaultLeverage.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxDailyWithdrawal" className="text-xs">
                Max Daily Withdrawal ($)
              </Label>
              <Input
                id="maxDailyWithdrawal"
                type="number"
                {...register("maxDailyWithdrawal", { valueAsNumber: true })}
              />
              {errors.maxDailyWithdrawal && (
                <p className="text-xs text-destructive">{errors.maxDailyWithdrawal.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxExposurePerAsset" className="text-xs">
                Max Exposure Per Asset ($)
              </Label>
              <Input
                id="maxExposurePerAsset"
                type="number"
                {...register("maxExposurePerAsset", { valueAsNumber: true })}
              />
              {errors.maxExposurePerAsset && (
                <p className="text-xs text-destructive">{errors.maxExposurePerAsset.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="marginCallThreshold" className="text-xs">
                Margin Call Threshold (%)
              </Label>
              <Input
                id="marginCallThreshold"
                type="number"
                {...register("marginCallThreshold", { valueAsNumber: true })}
              />
              {errors.marginCallThreshold && (
                <p className="text-xs text-destructive">{errors.marginCallThreshold.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="liquidationThreshold" className="text-xs">
                Liquidation Threshold (%)
              </Label>
              <Input
                id="liquidationThreshold"
                type="number"
                {...register("liquidationThreshold", { valueAsNumber: true })}
              />
              {errors.liquidationThreshold && (
                <p className="text-xs text-destructive">{errors.liquidationThreshold.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={!isDirty || updateSettings.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateSettings.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </div>

      <Separator />

      {/* User-Specific Overrides */}
      <div className="rounded-xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">User-Specific Overrides</h2>
            <p className="text-xs text-muted-foreground">
              Custom risk limits applied to individual users
            </p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs">Max Trade Size</TableHead>
              <TableHead className="text-xs">Max Leverage</TableHead>
              <TableHead className="text-xs">Max Daily Withdrawal</TableHead>
              <TableHead className="text-xs">Reason</TableHead>
              <TableHead className="text-xs">Set By</TableHead>
              <TableHead className="text-xs">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {overrides.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  No user-specific overrides configured
                </TableCell>
              </TableRow>
            ) : (
              overrides.map((override) => (
                <TableRow key={override.userId}>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{override.userName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{override.userId}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {override.maxTradeSize ? `$${override.maxTradeSize.toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {override.maxLeverage ? `${override.maxLeverage}x` : "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {override.maxDailyWithdrawal ? `$${override.maxDailyWithdrawal.toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {override.reason}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {override.setBy}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(override.setAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
