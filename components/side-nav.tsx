"use client"

import type React from "react"
import { useEffect, useState } from "react"
import {
  Home,
  Settings,
  Users,
  LogOut,
  List,
  Database,
  Bell,
  Check,
  UsersRound,
  LayoutDashboard,
  X,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { NotificationsContent } from "@/components/notifications-content"
import { getUserProfile } from "@/services/user-profile-service"
import {
  getUnreadNotificationsCount,
  subscribeToNotifications,
  markAllNotificationsAsRead,
} from "@/services/notification-service"

export function SideNav() {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return

      setIsLoadingProfile(true)
      try {
        const profile = await getUserProfile(user.id)
        if (profile) {
          setAvatarUrl(profile.avatar_url)
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    const fetchUnreadCount = async () => {
      if (!user) return

      try {
        const count = await getUnreadNotificationsCount(user.id)
        setUnreadCount(count)
      } catch (error) {
        console.error("Error fetching unread notifications count:", error)
      }
    }

    fetchUserProfile()
    fetchUnreadCount()

    // Set up real-time subscription for new notifications
    let subscription: { unsubscribe: () => void } | null = null

    if (user) {
      subscription = subscribeToNotifications(user.id, () => {
        setUnreadCount((prev) => prev + 1)
      })
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [user])

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "U"

  const navItems = [
    {
      href: "/",
      icon: Home,
      label: "Home",
    },
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "Dashboard",
    },
    {
      href: "/leads",
      icon: List,
      label: "Matched Leads",
    },
    {
      href: "/leads/all",
      icon: Database,
      label: "All Leads",
    },
    {
      href: "/groups",
      icon: UsersRound,
      label: "Groups",
    },
    {
      href: "/settings",
      icon: Settings,
      label: "Settings",
    },
  ]

  return (
    <>
      <div className="flex h-full w-16 md:w-20 flex-col items-center border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 py-4">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-600 text-white">
            <Users className="h-5 w-5" />
          </div>
        </div>
        <nav className="flex flex-1 flex-col items-center gap-4">
          <NavItem icon={<Home className="h-5 w-5" />} href="/" active={pathname === "/"} tooltip="Home" />
          <NavItem
            icon={<LayoutDashboard className="h-5 w-5" />}
            href="/dashboard"
            active={pathname === "/dashboard"}
            tooltip="Dashboard"
          />
          <NavItem
            icon={<List className="h-5 w-5" />}
            href="/leads"
            active={pathname === "/leads"}
            tooltip="Matched Leads"
          />
          <NavItem
            icon={<Database className="h-5 w-5" />}
            href="/leads/all"
            active={pathname === "/leads/all"}
            tooltip="All Leads"
          />
          <NavItem
            icon={<UsersRound className="h-5 w-5" />}
            href="/groups"
            active={pathname === "/groups"}
            tooltip="Groups"
          />
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-md transition-colors duration-300 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
            aria-label="Notifications"
            onClick={() => setShowNotifications(true)}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
          <NavItem
            icon={<Settings className="h-5 w-5" />}
            href="/settings"
            active={pathname === "/settings"}
            tooltip="Settings"
          />
        </nav>
        <div className="mt-auto flex flex-col items-center gap-4 pt-4">
          <Link href="/settings?tab=profile">
            <Avatar className="border border-gray-200 dark:border-gray-700 cursor-pointer hover:ring-2 hover:ring-gray-300 dark:hover:ring-gray-600 transition-all h-8 w-8">
              {isLoadingProfile ? (
                <div className="h-full w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></span>
                </div>
              ) : (
                <>
                  <AvatarImage src={avatarUrl || "/default-profile.png"} alt={user?.email || "User"} />
                  <AvatarFallback className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs">
                    {userInitials}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="sm:max-w-md md:max-w-lg border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-lg rounded-md p-0">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 p-4">
            <h3 className="font-medium text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs flex items-center gap-1 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
                onClick={async () => {
                  if (user) {
                    try {
                      await markAllNotificationsAsRead(user.id)
                      setUnreadCount(0)
                    } catch (error) {
                      console.error("Error marking all notifications as read:", error)
                    }
                  }
                }}
              >
                <Check className="h-3 w-3" />
                Mark all as read
              </Button>
            )}
          </div>

          <NotificationsContent
            userId={user?.id}
            setUnreadCount={setUnreadCount}
            onClose={() => setShowNotifications(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity duration-300",
          isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div
          className={cn(
            "absolute right-0 top-0 h-full w-64 bg-card p-4 shadow-lg transition-transform duration-300",
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold">Menu</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                  pathname === item.href ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className="mr-2 h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

interface NavItemProps {
  icon: React.ReactNode
  href: string
  active?: boolean
  badge?: number
  tooltip?: string
}

function NavItem({ icon, href, active, badge, tooltip }: NavItemProps) {
  return (
    <Link href={href} className="flex items-center justify-center relative group">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-10 w-10 rounded-md transition-colors duration-300",
          active
            ? "bg-gray-100 text-red-600 dark:bg-gray-800 dark:text-red-400"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400",
        )}
      >
        {icon}
      </Button>
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {tooltip && (
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap">
          {tooltip}
        </div>
      )}
    </Link>
  )
}
