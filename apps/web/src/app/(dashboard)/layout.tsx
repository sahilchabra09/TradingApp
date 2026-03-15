"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNavbar } from "@/components/dashboard/top-navbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-screen overflow-hidden bg-background">
          <div className="relative">
            <Sidebar />
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopNavbar />
            <main className="flex-1 overflow-y-auto bg-background/50 p-4 lg:p-6">
              {children}
            </main>
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
