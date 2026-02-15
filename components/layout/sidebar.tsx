"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, BarChart3, TrafficCone, Monitor, Bell, Settings } from "lucide-react"

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

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-72 border-r border-border bg-sidebar shadow-sm">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-20 items-center gap-3 border-b border-border px-6">
          <TrafficLightIcon className="h-7 w-7 text-primary" />
          <span className="text-lg font-semibold tracking-tight text-sidebar-foreground">
            Malolos Traffic Control
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-semibold transition-colors duration-150",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <item.icon className="h-6 w-6" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <div className="rounded-xl bg-secondary/50 p-4">
            <p className="text-xs text-muted-foreground">YOLO-Based Detection</p>
            <p className="mt-1 text-sm font-medium text-foreground">Dynamic Traffic System</p>
          </div>
        </div>
      </div>
    </aside>
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
