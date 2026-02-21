"use client"

import { useMemo, useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { listIntersections, getLineCounts } from "@/lib/api"
import type { IntersectionSummary } from "@/lib/types"
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

const LANE_ORDER = ["north", "south", "east"]

/** Map counting-line IDs to lane names */
const LINE_TO_LANE: Record<string, string> = {
  "north-exit": "north",
  "south-exit": "south",
  "east-exit": "east",
}

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
  countsData: Record<string, IntersectionCounts>
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 10
  const colW = (pageW - margin * 3) / 2 // two columns with gap
  const dateStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Ordered intersection IDs: graceland left, capitol right
  const ids = Object.keys(countsData)
  const leftId = ids.find((id) => id.toLowerCase().includes("graceland")) || ids[0]
  const rightId = ids.find((id) => id !== leftId) || ids[1]
  const columns = [leftId, rightId].filter(Boolean)

  // ─── Page 1: Title + Hourly Tables ───
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("Traffic Analytics Report", pageW / 2, margin + 4, { align: "center" })
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(dateStr, pageW / 2, margin + 10, { align: "center" })

  let startY = margin + 16

  columns.forEach((id, colIdx) => {
    const xOffset = margin + colIdx * (colW + margin)
    const rows = hourlyData[id] || []
    const name = countsData[id]?.name || id
    const grandTotal = rows.reduce((s, r) => s + r.total, 0)

    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text(`${name.charAt(0).toUpperCase() + name.slice(1)} Intersection`, xOffset, startY)
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    doc.text(`Total Vehicles: ${grandTotal}`, xOffset + colW, startY, { align: "right" })

    const body = rows.map((r) => [r.hour, String(r.total)])
    body.push([{ content: "Total", styles: { fontStyle: "bold" } } as unknown as string, { content: String(grandTotal), styles: { fontStyle: "bold" } } as unknown as string])

    autoTable(doc, {
      startY: startY + 2,
      margin: { left: xOffset, right: pageW - xOffset - colW },
      head: [["Hour", "Vehicles"]],
      body,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
      columnStyles: { 0: { cellWidth: colW * 0.7 }, 1: { cellWidth: colW * 0.3, halign: "right" } },
      tableWidth: colW,
    })
  })

  // ─── Page 2: Per-Lane Classification Tables (both intersections, stacked) ───
  doc.addPage()
  doc.setFontSize(16)
  doc.setFont("helvetica", "bold")
  doc.text("Vehicle Count Per Lane", pageW / 2, margin + 4, { align: "center" })
  doc.setFontSize(10)
  doc.setFont("helvetica", "normal")
  doc.text(dateStr, pageW / 2, margin + 10, { align: "center" })

  let classY = margin + 16

  columns.forEach((id) => {
    const counts = countsData[id]
    if (!counts) return
    const name = counts.name || id

    doc.setFontSize(11)
    doc.setFont("helvetica", "bold")
    doc.text(`${name.charAt(0).toUpperCase() + name.slice(1)} Intersection`, margin, classY)

    const sortedLanes = Object.entries(counts.lanes).sort(([a], [b]) => {
      const ai = LANE_ORDER.indexOf(a.toLowerCase())
      const bi = LANE_ORDER.indexOf(b.toLowerCase())
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })

    const fullW = pageW - margin * 2
    const head = [["Lane", ...VEHICLE_CLASSES, "Total"]]
    const body = sortedLanes.map(([lane, data]) => [
      lane.charAt(0).toUpperCase() + lane.slice(1),
      ...VEHICLE_CLASSES.map((cls) => String(data.classes[cls] || 0)),
      String(data.total),
    ])
    body.push([
      { content: "Total", styles: { fontStyle: "bold" } } as unknown as string,
      ...VEHICLE_CLASSES.map((cls) => ({ content: String(counts.classes[cls] || 0), styles: { fontStyle: "bold" } }) as unknown as string),
      { content: String(counts.total), styles: { fontStyle: "bold" } } as unknown as string,
    ])

    autoTable(doc, {
      startY: classY + 2,
      margin: { left: margin, right: margin },
      head,
      body,
      theme: "grid",
      styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
      headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: fullW * 0.1 },
        [VEHICLE_CLASSES.length + 1]: { fontStyle: "bold" },
      },
      tableWidth: fullW,
    })

    // Get the Y position after the table for the next one
    classY = (doc as unknown as Record<string, number>).lastAutoTable?.finalY + 10 || classY + 40
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

  // Initialize all lanes
  for (const lane of LANE_ORDER) {
    byLane[lane] = { total: 0, classes: {} }
  }

  if (counts) {
    for (const [lineId, classCounts] of Object.entries(counts)) {
      const laneName = LINE_TO_LANE[lineId] || lineId
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
  const [classificationId, setClassificationId] = useState("")

  const { data: intersections } = useSWR<IntersectionSummary[]>(
    "intersections",
    listIntersections,
    { refreshInterval: 5000 }
  )

  // Fetch line counts for ALL intersections (refreshed every 15s)
  useEffect(() => {
    if (!intersections?.length) return
    let cancelled = false

    async function fetchAll() {
      const results: Record<string, IntersectionCounts> = {}

      for (const ix of intersections!) {
        try {
          const data = await getLineCounts(ix.id)
          const { byLane, grandTotal, grandClasses } = parseLaneCounts(data?.counts)
          results[ix.id] = {
            id: ix.id,
            name: ix.name,
            total: grandTotal,
            classes: grandClasses,
            lanes: byLane,
          }
        } catch {
          results[ix.id] = {
            id: ix.id,
            name: ix.name,
            total: 0,
            classes: {},
            lanes: Object.fromEntries(LANE_ORDER.map((l) => [l, { total: 0, classes: {} }])),
          }
        }
      }

      if (!cancelled) setCountsData(results)
    }

    fetchAll()
    const interval = setInterval(fetchAll, 15000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [intersections])

  // Fetch hourly totals for each intersection (past 24 hours, refreshed every 30s)
  useEffect(() => {
    if (!intersections?.length) return
    let cancelled = false

    async function fetchHourly() {
      const windows = getHourlyWindows(24)
      const results: Record<string, HourlyTotal[]> = {}

      for (const ix of intersections!) {
        const rows: HourlyTotal[] = []
        for (const w of windows) {
          try {
            const data = await getLineCounts(ix.id, w.start, w.end)
            let total = 0
            if (data?.counts) {
              for (const classCounts of Object.values(data.counts) as Record<string, number>[]) {
                for (const count of Object.values(classCounts)) {
                  total += Number(count) || 0
                }
              }
            }
            rows.push({ hour: w.label, hourStart: w.start, total })
          } catch {
            rows.push({ hour: w.label, hourStart: w.start, total: 0 })
          }
        }
        results[ix.id] = rows
      }

      if (!cancelled) setHourlyByIntersection(results)
    }

    fetchHourly()
    const interval = setInterval(fetchHourly, 30000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [intersections])

  const report = useMemo(
    () => ({
      generated_at: new Date().toISOString(),
      intersections: countsData,
    }),
    [countsData]
  )

  const intersectionList = intersections || []

  // Auto-select first intersection for classification view
  useEffect(() => {
    if (intersectionList.length > 0 && !classificationId) {
      setClassificationId(intersectionList[0].id)
    }
  }, [intersectionList, classificationId])

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
                downloadPdf(`traffic_analytics_${ts}.pdf`, hourlyByIntersection, countsData)
              }}
              disabled={intersectionList.length === 0}
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

          {/* Hourly Total Vehicle Counts — side by side */}
          {intersectionList.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-2">
              {intersectionList.map((ix) => {
                const rows = hourlyByIntersection[ix.id] || []
                const grandTotal = rows.reduce((sum, r) => sum + r.total, 0)

                return (
                  <Card key={ix.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="capitalize">{ix.name}</CardTitle>
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
                )
              })}
            </div>
          )}

          {/* Vehicle Count Per Lane — with intersection selector */}
          {intersectionList.length > 0 && (() => {
            const counts = classificationId ? countsData[classificationId] : undefined
            const lanes: Record<string, { total: number; classes: Record<string, number> }> = counts?.lanes || Object.fromEntries(LANE_ORDER.map((l) => [l, { total: 0, classes: {} }]))
            const sortedLanes = Object.entries(lanes).sort(([a], [b]) => {
              const ai = LANE_ORDER.indexOf(a.toLowerCase())
              const bi = LANE_ORDER.indexOf(b.toLowerCase())
              return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
            })

            return (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle>Vehicle Count Per Lane</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Select Intersection:</span>
                      <select
                        value={classificationId}
                        onChange={(e) => setClassificationId(e.target.value)}
                        className="rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-sm capitalize text-green-800 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 dark:bg-green-950 dark:border-green-700 dark:text-green-200"
                      >
                      {intersectionList.map((ix) => (
                        <option key={ix.id} value={ix.id}>
                          {ix.name}
                        </option>
                      ))}
                    </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="p-2 font-medium text-muted-foreground">Lane</th>
                          <th className="p-2 font-medium text-muted-foreground text-right">Total</th>
                          {VEHICLE_CLASSES.map((cls) => (
                            <th key={cls} className="p-2 font-medium text-muted-foreground text-right whitespace-nowrap text-xs">
                              {cls}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedLanes.map(([laneName, laneData]) => (
                          <tr key={laneName} className="border-b last:border-0 hover:bg-muted/50">
                            <td className="p-2 capitalize font-medium">{laneName}</td>
                            <td className="p-2 text-right font-semibold tabular-nums">{laneData.total}</td>
                            {VEHICLE_CLASSES.map((cls) => (
                              <td key={cls} className="p-2 text-right tabular-nums text-muted-foreground">
                                {laneData.classes[cls] || 0}
                              </td>
                            ))}
                          </tr>
                        ))}
                        <tr className="border-t-2 font-semibold bg-muted/30">
                          <td className="p-2">Total</td>
                          <td className="p-2 text-right tabular-nums">{counts?.total ?? 0}</td>
                          {VEHICLE_CLASSES.map((cls) => (
                            <td key={cls} className="p-2 text-right tabular-nums">
                              {counts?.classes[cls] || 0}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )
          })()}
        </div>
      </main>
    </div>
  )
}
