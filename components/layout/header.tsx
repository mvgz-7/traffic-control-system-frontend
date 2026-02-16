"use client"

import { Bell, RefreshCw } from "lucide-react"
import { useMemo } from "react"
import Link from "next/link"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getDecisionLog, getHealthAlerts, listIntersections } from "@/lib/api"
import type { DecisionLogEntry, HealthAlert, IntersectionSummary } from "@/lib/types"
import type React from "react"

interface HeaderProps {
  title: string
  subtitle?: string
  onRefresh?: () => void
  isRefreshing?: boolean
  actions?: React.ReactNode
}

export function Header({ title, subtitle, onRefresh, isRefreshing, actions }: HeaderProps) {
  const { data: alerts } = useSWR<HealthAlert[]>("health-alerts", getHealthAlerts, {
    refreshInterval: 5000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  })

  const { data: intersections } = useSWR<IntersectionSummary[]>("intersections", listIntersections, {
    refreshInterval: 15000,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  })

  const activeIntersectionId = intersections?.[0]?.id

  const { data: decisionLog } = useSWR<DecisionLogEntry[]>(
    activeIntersectionId ? ["decision-log", activeIntersectionId] : null,
    activeIntersectionId ? () => getDecisionLog(activeIntersectionId, 25) : null,
    {
      refreshInterval: 5000,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  const notificationCount = useMemo(() => {
    const alertCount = alerts?.length ?? 0

    const nowSeconds = Date.now() / 1000
    const recentDecisionCount = (decisionLog ?? []).filter((d) => {
      if (typeof d.timestamp !== "number") return false
      return d.timestamp >= nowSeconds - 300
    }).length

    return alertCount + recentDecisionCount
  }, [alerts, decisionLog])

  const badgeText = notificationCount > 99 ? "99+" : String(notificationCount)

  return (
    <header className="sticky top-14 md:top-0 z-30 flex h-[80px] items-center justify-between border-b border-border bg-primary/10 px-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-primary/10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground leading-snug">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {actions}
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        )}
        <Button asChild variant="ghost" size="icon" className="relative">
          <Link href="/notifications" aria-label="Open notifications">
            <Bell className="h-5 w-5" />
            {notificationCount > 0 ? (
              <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-xs tabular-nums">
                {badgeText}
              </Badge>
            ) : null}
          </Link>
        </Button>
      </div>
    </header>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
