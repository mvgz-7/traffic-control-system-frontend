"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { LayoutDashboard, BarChart3, TrafficCone, Monitor, Bell, Settings, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Traffic Control", href: "/traffic-control", icon: TrafficCone },
  { name: "System Monitor", href: "/system", icon: Monitor },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

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
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors duration-150 md:text-base border",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground border-primary/30 ring-1 ring-primary/20"
                  : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-6 w-6" />
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
      <div className="md:hidden sticky top-0 z-40 border-b border-border bg-sidebar shadow-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <TrafficLightIcon className="h-6 w-6 text-primary" />
            <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
              Malolos Traffic Control
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:w-72 md:flex-col md:border-r md:border-border md:bg-sidebar md:shadow-sm">
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-border px-6">
            <TrafficLightIcon className="h-7 w-7 text-primary" />
            <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
              Malolos Traffic Control
            </span>
          </div>

          <NavLinks />

          <div className="border-t border-border p-4">
            <div className="rounded-xl bg-secondary/50 p-4">
              <p className="text-xs text-muted-foreground">YOLO Detection and VAC Algorithm</p>
              <p className="mt-1 text-sm font-medium text-foreground">Dynamic Traffic System</p>
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

          <aside className="absolute left-0 top-0 h-full w-72 border-r border-border bg-sidebar shadow-sm">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-3">
                <TrafficLightIcon className="h-6 w-6 text-primary" />
                <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
                  Menu
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
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
}

function TrafficLightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect x="7" y="2.5" width="10" height="19" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="7" r="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="17" r="2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}
