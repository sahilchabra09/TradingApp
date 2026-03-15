"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reportRequestSchema, type ReportRequestFormData } from "@/schemas";
import { adminService } from "@/services/admin.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileBarChart, Download, FileText, Users, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const reportTypes = [
  {
    value: "transactions",
    label: "Transaction Logs",
    description: "Complete transaction history with all details",
    icon: FileBarChart,
  },
  {
    value: "user_activity",
    label: "User Activity Reports",
    description: "User login, trading, and account activity",
    icon: Users,
  },
  {
    value: "kyc_audit",
    label: "KYC Audit Reports",
    description: "KYC verification history and compliance data",
    icon: ShieldCheck,
  },
];

export default function ReportsPage() {
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ReportRequestFormData>({
    resolver: zodResolver(reportRequestSchema),
    defaultValues: {
      type: "transactions",
      format: "csv",
      dateFrom: format(new Date(Date.now() - 30 * 86400000), "yyyy-MM-dd"),
      dateTo: format(new Date(), "yyyy-MM-dd"),
    },
  });

  const selectedType = watch("type");
  const selectedFormat = watch("format");

  const onSubmit = async (data: ReportRequestFormData) => {
    setIsGenerating(true);
    try {
      const blob = await adminService.generateReport(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.type}_report_${data.dateFrom}_${data.dateTo}.${data.format}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report generated and downloaded successfully");
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compliance Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate and download compliance reports for regulatory requirements
        </p>
      </div>

      {/* Report Type Selection */}
      <div className="grid gap-4 sm:grid-cols-3">
        {reportTypes.map((rt) => {
          const Icon = rt.icon;
          const isSelected = selectedType === rt.value;
          return (
            <button
              key={rt.value}
              type="button"
              onClick={() => setValue("type", rt.value as ReportRequestFormData["type"])}
              className={`relative rounded-xl border p-5 text-left transition-all duration-200 ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border/50 bg-card/80 hover:border-border hover:shadow-sm"
              }`}
            >
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${
                isSelected ? "bg-primary/10" : "bg-muted"
              }`}>
                <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <h3 className="text-sm font-semibold">{rt.label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{rt.description}</p>
              {isSelected && (
                <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {/* Report Configuration */}
      <form onSubmit={handleSubmit(onSubmit)} className="rounded-xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Report Configuration</h2>
            <p className="text-xs text-muted-foreground">
              Set date range and format for your report
            </p>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="dateFrom" className="text-xs">Date From</Label>
            <Input id="dateFrom" type="date" {...register("dateFrom")} />
            {errors.dateFrom && (
              <p className="text-xs text-destructive">{errors.dateFrom.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateTo" className="text-xs">Date To</Label>
            <Input id="dateTo" type="date" {...register("dateTo")} />
            {errors.dateTo && (
              <p className="text-xs text-destructive">{errors.dateTo.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Format</Label>
            <Select value={selectedFormat} onValueChange={(v) => setValue("format", v as ReportRequestFormData["format"])}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button type="submit" className="w-full" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Recent Reports */}
      <div className="rounded-xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-lg font-semibold">Recent Reports</h2>
        <div className="space-y-3">
          {[
            { name: "Transaction Log - Jan 2026", date: "Jan 31, 2026", format: "CSV", size: "2.4 MB" },
            { name: "KYC Audit Report - Q4 2025", date: "Jan 15, 2026", format: "PDF", size: "1.8 MB" },
            { name: "User Activity - Dec 2025", date: "Jan 5, 2026", format: "CSV", size: "3.1 MB" },
          ].map((report, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{report.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Generated {report.date} · {report.format} · {report.size}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
