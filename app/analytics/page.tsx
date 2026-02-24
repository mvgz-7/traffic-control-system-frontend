"use client"

import { useMemo, useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { IntersectionSelector } from "@/components/dashboard/intersection-selector"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { listIntersections, getLineCounts, getVehicleCountReport } from "@/lib/api"
import type { IntersectionSummary, VehicleCountReportRecord } from "@/lib/types"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const VEHICLE_CLASSES = [
  "Bus",
  "Car",
  "E-jeep",
  "Jeepney",
  "Motorcycle",
  "Tricycle",
  "Truck",
  "Van",
]

const TIME_RANGE_OPTIONS = [
  { label: "Last 5 min", minutes: 5 },
  { label: "Last 30 min", minutes: 30 },
  { label: "Last 1 hour", minutes: 60 },
  { label: "Last 6 hours", minutes: 360 },
  { label: "Last 24 hours", minutes: 1440 },
] as const

type HourlyTotal = {
  hour: string
  hourStart: number
  total: number
}

/** Generate hourly time windows for the past N hours */
function getHourlyWindows(
  numHours: number
): { label: string; start: number; end: number }[] {
  const now = new Date()
  const currentHourStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    0,
    0
  )
  const windows: { label: string; start: number; end: number }[] = []

  for (let i = numHours - 1; i >= 0; i--) {
    const start = new Date(currentHourStart.getTime() - i * 3600000)
    const end = new Date(start.getTime() + 3600000)
    const label = `${start.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })} – ${end.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`
    windows.push({
      label,
      start: start.getTime() / 1000,
      end: end.getTime() / 1000,
    })
  }

  return windows
}

type LaneCounts = Record<string, Record<string, number>>

type IntersectionCounts = {
  id: string
  name: string
  total: number
  classes: Record<string, number>
  lanes: Record<string, { total: number; classes: Record<string, number> }>
}

function downloadPdf(
  filename: string,
  hourlyData: Record<string, HourlyTotal[]>,
  counts: IntersectionCounts,
  timeRangeMinutes: number
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 10
  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const name = counts.name || counts.id
  const displayName = name.charAt(0).toUpperCase() + name.slice(1)
  const rows = hourlyData[counts.id] || []
  const grandTotal = rows.reduce((s, r) => s + r.total, 0)
  const tableW = pageW - margin * 2

  // ─── Page 1: Title + Hourly Table (single intersection) ───
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(`Traffic Analytics Report — ${displayName} Intersection`, pageW / 2, margin + 4, { align: "center" })
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(dateStr, pageW / 2, margin + 10, { align: "center" })

  let startY = margin + 18

  doc.setFontSize(11)
  doc.setFont("helvetica", "bold")
  doc.text("Hourly Vehicle Counts", margin, startY)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.text(`Total Vehicles: ${grandTotal}`, pageW - margin, startY, { align: "right" })

  const hourlyBody = rows.map((r) => [r.hour, String(r.total)])
  hourlyBody.push([
    { content: "Total", styles: { fontStyle: "bold" } } as unknown as string,
    { content: String(grandTotal), styles: { fontStyle: "bold" } } as unknown as string,
  ])

  autoTable(doc, {
    startY: startY + 2,
    margin: { left: margin, right: margin },
    head: [["Hour", "Vehicles"]],
    body: hourlyBody,
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    columnStyles: { 0: { cellWidth: tableW * 0.7 }, 1: { cellWidth: tableW * 0.3, halign: "right" } },
    tableWidth: tableW,
  })

  // ─── Page 2: Vehicle Classification Table ───
  doc.addPage()
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text(`Vehicle Classification — ${displayName} Intersection`, pageW / 2, margin + 4, { align: "center" })
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  const rangeEnd = new Date()
  const rangeStart = new Date(rangeEnd.getTime() - timeRangeMinutes * 60 * 1000)
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })
  const actualRange = `${fmt(rangeStart)} – ${fmt(rangeEnd)}`
  const headerLine = timeRangeMinutes === 1440 ? dateStr : `${dateStr}  |  ${actualRange}`
  doc.text(headerLine, pageW / 2, margin + 10, { align: "center" })

  const classY = margin + 18
  const fullW = pageW - margin * 2

  const classBody = VEHICLE_CLASSES.map((cls) => [
    cls,
    String(counts.classes[cls] || 0),
  ])
  classBody.push([
    { content: "Total", styles: { fontStyle: "bold" } } as unknown as string,
    { content: String(counts.total), styles: { fontStyle: "bold" } } as unknown as string,
  ])

  autoTable(doc, {
    startY: classY,
    margin: { left: margin, right: margin },
    head: [["Vehicle Type", "Count"]],
    body: classBody,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold", fontSize: 10 },
    columnStyles: { 0: { cellWidth: fullW * 0.6 }, 1: { cellWidth: fullW * 0.4, halign: "right" } },
    tableWidth: fullW,
  })

  // Footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont("helvetica", "italic")
    doc.text(
      `Generated: ${new Date().toLocaleString()} | Page ${i} of ${totalPages}`,
      pageW / 2,
      pageH - 5,
      { align: "center" }
    )
  }

  doc.save(filename)
}

function parseLaneCounts(counts: LaneCounts | undefined) {
  const byLane: Record<string, { total: number; classes: Record<string, number> }> = {}
  let grandTotal = 0
  const grandClasses: Record<string, number> = {}

  if (counts) {
    for (const [lineId, classCounts] of Object.entries(counts)) {
      // Use the line ID directly as the lane name (no hardcoded mapping)
      const laneName = lineId
      if (!byLane[laneName]) {
        byLane[laneName] = { total: 0, classes: {} }
      }
      for (const [className, count] of Object.entries(classCounts)) {
        const c = Number(count) || 0
        byLane[laneName].classes[className] = (byLane[laneName].classes[className] || 0) + c
        byLane[laneName].total += c
        grandClasses[className] = (grandClasses[className] || 0) + c
        grandTotal += c
      }
    }
  }

  return { byLane, grandTotal, grandClasses }
}

export default function AnalyticsPage() {
  const [countsData, setCountsData] = useState<Record<string, IntersectionCounts>>({})
  const [hourlyByIntersection, setHourlyByIntersection] = useState<Record<string, HourlyTotal[]>>({})
  const [selectedId, setSelectedId] = useState("")
  const [timeRangeMinutes, setTimeRangeMinutes] = useState(1440) // default: last 24 hours

  const { data: intersections } = useSWR<IntersectionSummary[]>(
    "intersections",
    listIntersections,
    { refreshInterval: 5000 }
  )

  // Fetch line counts for the SELECTED intersection (refreshed every 15s)
  useEffect(() => {
    if (!intersections?.length || !selectedId) return
    let cancelled = false
    const ix = intersections.find((i) => i.id === selectedId)
    if (!ix) return

    async function fetchCounts() {
      const now = Math.floor(Date.now() / 1000)
      const start = now - timeRangeMinutes * 60

      try {
        const data = await getLineCounts(ix!.id, start, now)
        const { byLane, grandTotal, grandClasses } = parseLaneCounts(data?.counts)
        if (!cancelled) {
          setCountsData((prev) => ({
            ...prev,
            [ix!.id]: {
              id: ix!.id,
              name: ix!.name,
              total: grandTotal,
              classes: grandClasses,
              lanes: byLane,
            },
          }))
        }
      } catch {
        if (!cancelled) {
          setCountsData((prev) => ({
            ...prev,
            [ix!.id]: { id: ix!.id, name: ix!.name, total: 0, classes: {}, lanes: {} },
          }))
        }
      }
    }

    fetchCounts()
    const interval = setInterval(fetchCounts, 15000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [intersections, selectedId, timeRangeMinutes])

  // Fetch hourly totals for the SELECTED intersection
  const numHours = Math.max(1, Math.ceil(timeRangeMinutes / 60))
  useEffect(() => {
    if (!intersections?.length || !selectedId) return
    let cancelled = false
    const ix = intersections.find((i) => i.id === selectedId)
    if (!ix) return

    async function fetchHourly() {
      const now = new Date()
      const currentHourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0)
      const startTs = currentHourStart.getTime() / 1000 - (numHours - 1) * 3600
      const endTs = currentHourStart.getTime() / 1000 + 3600
      const windows = getHourlyWindows(numHours)

      try {
        const report = await getVehicleCountReport(ix!.id, startTs, endTs, "hour")
        const periodTotals: Record<string, number> = {}
        for (const record of report.data || []) {
          periodTotals[record.period] = (periodTotals[record.period] || 0) + record.count
        }

        const rows: HourlyTotal[] = windows.map((w) => {
          const hourDate = new Date(w.start * 1000)
          // Match backend strftime format: YYYY-MM-DDTHH:00:00
          const periodKey = `${hourDate.getFullYear()}-${String(hourDate.getMonth() + 1).padStart(2, "0")}-${String(hourDate.getDate()).padStart(2, "0")}T${String(hourDate.getHours()).padStart(2, "0")}:00:00`
          return { hour: w.label, hourStart: w.start, total: periodTotals[periodKey] || 0 }
        })

        if (!cancelled) {
          setHourlyByIntersection((prev) => ({ ...prev, [ix!.id]: rows }))
        }
      } catch {
        const windows2 = getHourlyWindows(numHours)
        if (!cancelled) {
          setHourlyByIntersection((prev) => ({
            ...prev,
            [ix!.id]: windows2.map((w) => ({ hour: w.label, hourStart: w.start, total: 0 })),
          }))
        }
      }
    }

    fetchHourly()
    const interval = setInterval(fetchHourly, 30000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [intersections, selectedId, numHours])

  const report = useMemo(
    () => ({
      generated_at: new Date().toISOString(),
      intersections: countsData,
    }),
    [countsData]
  )

  const intersectionList = intersections || []

  // Auto-select first intersection
  useEffect(() => {
    if (intersectionList.length > 0 && !selectedId) {
      setSelectedId(intersectionList[0].id)
    }
  }, [intersectionList, selectedId])

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="min-w-0 md:pl-72">
        <Header
          title="Traffic Analytics"
          subtitle="Vehicle count summary across all intersections"
          actions={
            <Button
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary/10"
              onClick={() => {
                const ts = new Date().toISOString().replace(/[:.]/g, "-")
                const selected = countsData[selectedId]
                if (selected) {
                  downloadPdf(`traffic_analytics_${selectedId}_${ts}.pdf`, hourlyByIntersection, selected, timeRangeMinutes)
                }
              }}
              disabled={!selectedId || !countsData[selectedId]}
            >
              Save Report
            </Button>
          }
        />
        <div className="space-y-6 p-6">
          {intersectionList.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No intersections found.
            </p>
          )}

          {/* Intersection Selector */}
          {intersectionList.length > 0 && (
            <IntersectionSelector
              intersections={intersectionList}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}

          {/* Time Range Selector */}
          {intersectionList.length > 0 && (
            <Card>
              <CardContent className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-foreground whitespace-nowrap">Time Range:</span>
                  {TIME_RANGE_OPTIONS.map((opt) => (
                    <Button
                      key={opt.minutes}
                      size="sm"
                      variant={timeRangeMinutes === opt.minutes ? "default" : "outline"}
                      onClick={() => setTimeRangeMinutes(opt.minutes)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hourly and Vehicle Classification — side-by-side */}
          {intersectionList.length > 0 && selectedId && (() => {
            const rows = hourlyByIntersection[selectedId] || []
            const grandTotal = rows.reduce((sum, r) => sum + r.total, 0)
            const selectedIx = intersectionList.find((ix) => ix.id === selectedId)
            const counts = countsData[selectedId]

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="capitalize">{selectedIx?.name ?? selectedId}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">
                        Total: {grandTotal}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="p-2 font-medium text-muted-foreground">Hour</th>
                            <th className="p-2 font-medium text-muted-foreground text-right">Vehicles</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row) => (
                            <tr key={row.hourStart} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="p-2 whitespace-nowrap text-xs">{row.hour}</td>
                              <td className="p-2 text-right font-semibold tabular-nums">{row.total}</td>
                            </tr>
                          ))}
                          {rows.length === 0 && (
                            <tr>
                              <td colSpan={2} className="p-4 text-center text-muted-foreground text-xs">Loading...</td>
                            </tr>
                          )}
                          <tr className="border-t-2 font-semibold bg-muted/30">
                            <td className="p-2">Total</td>
                            <td className="p-2 text-right tabular-nums">{grandTotal}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle>Vehicle Classification</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">
                        Total: {counts?.total ?? 0}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left">
                            <th className="p-2 font-medium text-muted-foreground">Vehicle Type</th>
                            <th className="p-2 font-medium text-muted-foreground text-right">Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          {VEHICLE_CLASSES.map((cls) => (
                            <tr key={cls} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="p-2 font-medium">{cls}</td>
                              <td className="p-2 text-right font-semibold tabular-nums">{counts?.classes[cls] || 0}</td>
                            </tr>
                          ))}
                          <tr className="border-t-2 font-semibold bg-muted/30">
                            <td className="p-2">Total</td>
                            <td className="p-2 text-right tabular-nums">{counts?.total ?? 0}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          })()}
        </div>
      </main>
    </div>
  )
}