"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, memo, useMemo } from "react"
import { cn } from "@/lib/utils"
import useSWR from "swr"
import { LayoutDashboard, BarChart3, TrafficCone, Monitor, Bell, Settings, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getHealthAlerts, listIntersections, getDecisionLog } from "@/lib/api"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Traffic Control", href: "/traffic-control", icon: TrafficCone },
  { name: "System Monitor", href: "/system", icon: Monitor },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
]

export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  // notification counts (health alerts + recent decisions for first intersection)
  const { data: alerts } = useSWR("health-alerts", getHealthAlerts, { refreshInterval: 5000 })
  const { data: intersections } = useSWR("intersections", listIntersections, { refreshInterval: 15000 })
  const activeIntersectionId = intersections?.[0]?.id
  const { data: decisionLog } = useSWR(activeIntersectionId ? ["decision-log", activeIntersectionId] : null, activeIntersectionId ? () => getDecisionLog(activeIntersectionId, 25) : null, { refreshInterval: 5000 })

  const notificationCount = useMemo(() => {
    const alertCount = alerts?.length ?? 0
    const nowSeconds = Date.now() / 1000
    const recentDecisionCount = (decisionLog ?? []).filter((d) => typeof d.timestamp === "number" && d.timestamp >= nowSeconds - 300).length
    return alertCount + recentDecisionCount
  }, [alerts, decisionLog])

  const badgeText = notificationCount > 99 ? "99+" : String(notificationCount)

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 p-4">
        <div className="space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNavigate}
                className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors duration-150 transform-gpu will-change-transform md:text-base border",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground border-sidebar-primary/30 ring-1 ring-sidebar-primary/20"
                  : "border-transparent text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              {item.name === "Notifications" ? (
                <div className="relative">
                  <item.icon className="h-6 w-6" />
                  {notificationCount > 0 && (
                    <Badge className="absolute -right-2 -top-2 h-5 min-w-5 rounded-full px-1 text-xs tabular-nums">
                      {badgeText}
                    </Badge>
                  )}
                </div>
              ) : (
                <item.icon className="h-6 w-6" />
              )}
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )

  return (
    <>
      {/* Mobile top bar with hamburger */}
      <div className="md:hidden sticky top-0 z-40 border-b border-sidebar-border bg-sidebar shadow-md">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <TrafficLightIcon className="h-6 w-6" />
            <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
              Malolos Traffic Control
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="text-sidebar-foreground hover:bg-white/10"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-72 md:flex-col md:border-r md:border-sidebar-border md:bg-sidebar md:shadow-lg">
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-6">
            <TrafficLightIcon className="h-7 w-7" />
            <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
              Malolos Traffic Control
            </span>
          </div>

          <NavLinks />

          <div className="border-t border-sidebar-border p-4">
            <div className="rounded-xl bg-sidebar-accent p-4">
              <p className="text-xs text-sidebar-foreground/50">YOLO Detection and VAC Algorithm</p>
              <p className="mt-1 text-sm font-medium text-sidebar-foreground">Dynamic Traffic System</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="absolute left-0 top-0 h-full w-72 border-r border-sidebar-border bg-sidebar shadow-lg">
            <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
              <div className="flex items-center gap-3">
                <TrafficLightIcon className="h-6 w-6" />
                <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
                  Menu
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
                className="text-sidebar-foreground hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <NavLinks onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
})

function TrafficLightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="7" y="2.5" width="10" height="19" rx="2" fill="#1c1c1e" stroke="#4ade80" strokeWidth="1.4" />
      <circle cx="12" cy="7" r="2.2" fill="#ef4444" />
      <circle cx="12" cy="12" r="2.2" fill="#facc15" />
      <circle cx="12" cy="17" r="2.2" fill="#22c55e" />
    </svg>
  )
}
