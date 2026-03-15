"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/schemas";
import { useAuthStore } from "@/stores/auth-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TrendingUp, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      // In production, this would call WorkOS AuthKit
      // For demo, we simulate a login
      await new Promise((r) => setTimeout(r, 1000));

      if (data.email === "admin@tradingapp.com" && data.password === "admin1234") {
        setUser(
          {
            id: "admin_001",
            email: data.email,
            name: "Super Admin",
            role: "super_admin",
            lastLogin: new Date().toISOString(),
            createdAt: "2024-01-01T00:00:00Z",
          },
          "mock-jwt-token"
        );
        toast.success("Welcome back!");
        router.push("/dashboard");
      } else if (data.email === "compliance@tradingapp.com" && data.password === "admin1234") {
        setUser(
          {
            id: "admin_002",
            email: data.email,
            name: "Compliance Officer",
            role: "compliance_officer",
            lastLogin: new Date().toISOString(),
            createdAt: "2024-01-01T00:00:00Z",
          },
          "mock-jwt-token"
        );
        toast.success("Welcome back!");
        router.push("/dashboard");
      } else {
        toast.error("Invalid credentials. Try admin@tradingapp.com / admin1234");
      }
    } catch {
      toast.error("Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <TrendingUp className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">TradingApp Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to access the admin dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-xl border border-border/50 bg-card/80 p-6 backdrop-blur-sm">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@tradingapp.com"
                  {...register("email")}
                  autoComplete="email"
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    {...register("password")}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
            </div>

            <Button type="submit" className="mt-6 w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6 rounded-lg border border-dashed border-border/50 bg-muted/30 p-4">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Demo Credentials</p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Super Admin:</span>{" "}
              admin@tradingapp.com / admin1234
            </p>
            <p>
              <span className="font-medium text-foreground">Compliance:</span>{" "}
              compliance@tradingapp.com / admin1234
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] text-muted-foreground">
          Regulated by FSC Mauritius · Secured with WorkOS AuthKit
        </p>
      </div>
    </div>
  );
}
