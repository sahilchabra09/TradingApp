"use client";

import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Sun,
  Moon,
  Menu,
  LogOut,
  Settings,
  User,
  Circle,
} from "lucide-react";
import { useSidebarStore } from "@/stores/sidebar-store";
import { useAuthStore } from "@/stores/auth-store";
import { useNotifications, useSystemHealth } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

const statusColors = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  down: "bg-red-500",
};

const notificationTypeColors = {
  info: "text-blue-500",
  warning: "text-amber-500",
  error: "text-red-500",
  success: "text-emerald-500",
};

export function TopNavbar() {
  const { theme, setTheme } = useTheme();
  const { setMobileOpen } = useSidebarStore();
  const { user, logout, markNotificationRead } = useAuthStore();
  const { data: notifications = [] } = useNotifications();
  const { data: systemHealth } = useSystemHealth();

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/50 bg-card/50 px-4 backdrop-blur-xl lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden items-center gap-2 sm:flex">
          {systemHealth && (
            <div className="flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-1.5">
              <Circle
                className={cn("h-2 w-2 fill-current", statusColors[systemHealth.status])}
              />
              <span className="text-xs font-medium capitalize">
                {systemHealth.status === "operational" ? "All Systems Operational" : systemHealth.status}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-9 w-9"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b p-3">
              <h4 className="text-sm font-semibold">Notifications</h4>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <ScrollArea className="max-h-80">
              {notifications.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  No notifications
                </p>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      className={cn(
                        "flex flex-col gap-1 border-b p-3 text-left transition-colors hover:bg-accent/50",
                        !notification.read && "bg-accent/20"
                      )}
                      onClick={() => markNotificationRead(notification.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Circle
                          className={cn(
                            "h-2 w-2 fill-current",
                            notificationTypeColors[notification.type]
                          )}
                        />
                        <span className="text-xs font-semibold">{notification.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground pl-4">
                        {notification.message}
                      </p>
                      <span className="text-[10px] text-muted-foreground pl-4">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {user?.name?.split(" ").map((n) => n[0]).join("") || "AD"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start md:flex">
                <span className="text-xs font-medium">{user?.name || "Admin"}</span>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {user?.role?.replace("_", " ") || "Super Admin"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.name || "Admin"}</span>
                <span className="text-xs text-muted-foreground">{user?.email || "admin@tradingapp.com"}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
