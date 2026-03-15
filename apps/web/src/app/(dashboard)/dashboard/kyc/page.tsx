"use client";

import { useState } from "react";
import { useKYCRequests, useKYCDetail, useApproveKYC, useRejectKYC } from "@/hooks/use-admin";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTablePagination } from "@/components/dashboard/data-table-pagination";
import {
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  User,
  ShieldCheck,
  ShieldX,
  ScanFace,
  Fingerprint,
  Loader2,
  Globe,
  Calendar,
  Clock,
  MapPin,
  Hash,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { KYCRequest, AdminApprovalStatus } from "@/types";
import { format } from "date-fns";
import { toast } from "sonner";
import Image from "next/image";

const diditStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Didit Pending", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  approved: { label: "Didit Approved", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  declined: { label: "Didit Declined", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  expired: { label: "Expired", className: "bg-muted text-muted-foreground" },
  abandoned: { label: "Abandoned", className: "bg-muted text-muted-foreground" },
};

const approvalStatusConfig: Record<string, { label: string; className: string }> = {
  pending_approval: { label: "Pending Admin Review", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  approved: { label: "Admin Approved", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  rejected: { label: "Admin Rejected", className: "bg-red-500/10 text-red-500 border-red-500/20" },
};

// Map old KYCStatus to display config for the table
const kycStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  approved: { label: "Approved", className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-500 border-red-500/20" },
  not_submitted: { label: "Not Submitted", className: "bg-muted text-muted-foreground" },
};

function getAdminApprovalBadge(adminApproval: AdminApprovalStatus) {
  if (!adminApproval) return null;
  const config = approvalStatusConfig[adminApproval];
  if (!config) return null;
  return (
    <Badge variant="outline" className={cn("text-[10px]", config.className)}>
      {config.label}
    </Badge>
  );
}

function VerificationBadge({ passed, label, score }: { passed: boolean; label: string; score?: number }) {
  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg border p-3",
      passed
        ? "border-emerald-500/20 bg-emerald-500/5"
        : "border-red-500/20 bg-red-500/5"
    )}>
      {passed ? (
        <ShieldCheck className="h-5 w-5 text-emerald-500" />
      ) : (
        <ShieldX className="h-5 w-5 text-red-500" />
      )}
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className={cn("text-xs", passed ? "text-emerald-500" : "text-red-500")}>
          {passed ? "Passed" : "Failed"}
          {score != null && ` · ${(score * 100).toFixed(0)}%`}
        </p>
      </div>
    </div>
  );
}

function DocumentImage({ src, label }: { src?: string; label: string }) {
  if (!src) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed bg-muted/30">
          <div className="text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-xs text-muted-foreground">Not available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="relative h-48 overflow-hidden rounded-lg border bg-muted/30">
        <Image
          src={src}
          alt={label}
          fill
          className="object-contain"
          unoptimized
        />
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function KYCPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedKYCId, setSelectedKYCId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data, isLoading } = useKYCRequests({ page, pageSize: 10, status: statusFilter });
  const { data: kycDetail, isLoading: isLoadingDetail } = useKYCDetail(selectedKYCId);
  const approveKYC = useApproveKYC();
  const rejectKYC = useRejectKYC();

  const handleOpenDetail = (kyc: KYCRequest) => {
    setSelectedKYCId(kyc.id);
  };

  const handleCloseDetail = () => {
    setSelectedKYCId(null);
  };

  const handleApprove = (id: string) => {
    approveKYC.mutate(id, {
      onSuccess: () => {
        toast.success("KYC approved — user can now trade");
        handleCloseDetail();
      },
      onError: () => toast.error("Failed to approve KYC"),
    });
  };

  const handleReject = () => {
    if (!rejectingId || !rejectReason.trim()) return;
    rejectKYC.mutate(
      { id: rejectingId, reason: rejectReason },
      {
        onSuccess: () => {
          toast.success("KYC rejected");
          setShowRejectDialog(false);
          setRejectReason("");
          setRejectingId(null);
          handleCloseDetail();
        },
        onError: () => toast.error("Failed to reject KYC"),
      }
    );
  };

  const vd = kycDetail?.verificationDetails;
  const canAdminAct = kycDetail && kycDetail.status === "approved" && kycDetail.adminApprovalStatus === "pending_approval";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">KYC Verification</h1>
        <p className="text-sm text-muted-foreground">
          Review and manage KYC verification requests · Powered by Didit Identity
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
            <SelectItem value="approved">Didit Approved</SelectItem>
            <SelectItem value="declined">Didit Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs">User</TableHead>
              <TableHead className="text-xs">Didit Status</TableHead>
              <TableHead className="text-xs">Admin Approval</TableHead>
              <TableHead className="text-xs">Submitted</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : data?.data.map((kyc) => {
                  const status = kycStatusConfig[kyc.status] || kycStatusConfig.pending;
                  return (
                    <TableRow key={kyc.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{kyc.userName}</p>
                          <p className="text-xs text-muted-foreground">{kyc.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", status.className)}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getAdminApprovalBadge(kyc.adminApprovalStatus) || (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(kyc.submittedAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDetail(kyc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {kyc.adminApprovalStatus === "pending_approval" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-emerald-500 hover:text-emerald-600"
                                onClick={() => handleApprove(kyc.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-600"
                                onClick={() => {
                                  setRejectingId(kyc.id);
                                  setShowRejectDialog(true);
                                }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
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

      {/* KYC Detail Dialog */}
      <Dialog open={!!selectedKYCId} onOpenChange={handleCloseDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {kycDetail ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  KYC Review — {kycDetail.userName}
                  {kycDetail.status && (
                    <Badge variant="outline" className={cn("text-[10px]", (diditStatusConfig[kycDetail.status] || diditStatusConfig.pending).className)}>
                      {(diditStatusConfig[kycDetail.status] || diditStatusConfig.pending).label}
                    </Badge>
                  )}
                  {getAdminApprovalBadge(kycDetail.adminApprovalStatus)}
                </DialogTitle>
                <DialogDescription>{kycDetail.userEmail}</DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="verification" className="mt-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="verification" className="gap-1.5 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verification
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="gap-1.5 text-xs">
                    <FileText className="h-3.5 w-3.5" />
                    Documents
                  </TabsTrigger>
                  <TabsTrigger value="biometrics" className="gap-1.5 text-xs">
                    <ScanFace className="h-3.5 w-3.5" />
                    Biometrics
                  </TabsTrigger>
                  <TabsTrigger value="audit" className="gap-1.5 text-xs">
                    <Fingerprint className="h-3.5 w-3.5" />
                    Details
                  </TabsTrigger>
                </TabsList>

                {/* Verification Summary Tab */}
                <TabsContent value="verification" className="space-y-4 mt-4">
                  {vd ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <VerificationBadge passed={vd.documentVerified} label="ID Document" />
                        <VerificationBadge passed={vd.livenessVerified} label="Liveness Check" score={vd.livenessScore} />
                        <VerificationBadge passed={vd.faceMatchVerified} label="Face Match" score={vd.faceMatchScore} />
                      </div>

                      <div className="rounded-xl border bg-card/50 p-4 space-y-3">
                        <h4 className="text-sm font-semibold">Extracted Identity Data</h4>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <InfoRow icon={User} label="Full Name" value={vd.fullName} />
                          <InfoRow icon={Calendar} label="Date of Birth" value={vd.dateOfBirth} />
                          <InfoRow icon={Globe} label="Nationality" value={vd.nationality} />
                          <InfoRow icon={FileText} label="Document Type" value={vd.documentType?.replace(/_/g, " ")} />
                          <InfoRow icon={Hash} label="Document Number" value={vd.documentNumber} />
                          <InfoRow icon={Calendar} label="Expiration Date" value={vd.expirationDate} />
                          <InfoRow icon={MapPin} label="Address" value={vd.address} />
                          <InfoRow icon={Globe} label="Issuing State" value={vd.issuingState} />
                          <InfoRow icon={User} label="Gender" value={vd.gender} />
                          <InfoRow icon={Clock} label="Age" value={vd.age} />
                        </div>
                      </div>

                      {vd.warnings && vd.warnings.length > 0 && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                          <h4 className="text-sm font-semibold text-amber-600">Warnings</h4>
                          {vd.warnings.map((w: any, i: number) => (
                            <p key={i} className="text-xs text-amber-700">
                              {w.short_description || w.long_description || w.feature || "Unknown warning"}
                              {w.risk && <span className="ml-1 text-amber-500">({w.risk})</span>}
                            </p>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <ShieldX className="h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-3 text-sm font-medium">No verification data available</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        The user may not have completed the Didit verification flow yet,
                        or the webhook has not fired.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DocumentImage src={vd?.frontImage} label="Document Front" />
                    <DocumentImage src={vd?.backImage} label="Document Back" />
                  </div>
                  {vd?.portraitImage && (
                    <DocumentImage src={vd.portraitImage} label="Portrait (from document)" />
                  )}
                </TabsContent>

                {/* Biometrics Tab */}
                <TabsContent value="biometrics" className="space-y-4 mt-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DocumentImage src={vd?.selfieImage} label="Liveness Selfie" />
                    <DocumentImage src={vd?.portraitImage} label="Document Portrait" />
                  </div>
                  {vd && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <VerificationBadge passed={vd.livenessVerified} label="Liveness Detection" score={vd.livenessScore} />
                      <VerificationBadge passed={vd.faceMatchVerified} label="Face Match" score={vd.faceMatchScore} />
                    </div>
                  )}
                  {!vd && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <ScanFace className="h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-3 text-sm text-muted-foreground">No biometric data available</p>
                    </div>
                  )}
                </TabsContent>

                {/* Details Tab */}
                <TabsContent value="audit" className="mt-4 space-y-4">
                  <div className="rounded-xl border bg-card/50 p-4 space-y-3">
                    <h4 className="text-sm font-semibold">Session Info</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoRow icon={Hash} label="Session ID" value={kycDetail.diditSessionId} />
                      <InfoRow icon={Calendar} label="Created" value={kycDetail.createdAt ? format(new Date(kycDetail.createdAt), "MMM d, yyyy HH:mm") : undefined} />
                      <InfoRow icon={Calendar} label="Updated" value={kycDetail.updatedAt ? format(new Date(kycDetail.updatedAt), "MMM d, yyyy HH:mm") : undefined} />
                      <InfoRow icon={Globe} label="IP Country" value={vd?.ipCountry} />
                      <InfoRow icon={Globe} label="IP Address" value={vd?.ipAddress} />
                      <InfoRow icon={Smartphone} label="Device" value={vd?.deviceBrand && vd?.deviceModel ? `${vd.deviceBrand} ${vd.deviceModel}` : undefined} />
                    </div>
                    {vd?.isVpnOrTor && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2">
                        <p className="text-xs font-medium text-red-500">⚠ VPN/Tor detected</p>
                      </div>
                    )}
                  </div>

                  {kycDetail.adminReviewedAt && (
                    <div className="rounded-xl border bg-card/50 p-4 space-y-3">
                      <h4 className="text-sm font-semibold">Admin Review</h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <InfoRow icon={User} label="Reviewed By" value={kycDetail.adminReviewedBy} />
                        <InfoRow icon={Calendar} label="Reviewed At" value={format(new Date(kycDetail.adminReviewedAt), "MMM d, yyyy HH:mm")} />
                      </div>
                      {kycDetail.adminRejectionReason && (
                        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                          <p className="text-xs font-medium text-red-500">Rejection Reason</p>
                          <p className="text-sm mt-1">{kycDetail.adminRejectionReason}</p>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {canAdminAct && (
                <DialogFooter className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRejectingId(kycDetail.id);
                      setShowRejectDialog(true);
                    }}
                    className="text-red-500"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                  <Button onClick={() => handleApprove(kycDetail.id)} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve — Allow Trading
                  </Button>
                </DialogFooter>
              )}
            </>
          ) : isLoadingDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-3 text-sm text-muted-foreground">Loading verification data...</span>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject KYC Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this KYC request. The user will not be able to trade.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim()}
            >
              Reject KYC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
