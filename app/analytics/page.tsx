"use client"

import { useMemo, useState, useEffect } from "react"
import useSWR from "swr"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { listIntersections, getLineCounts } from "@/lib/api"
import type { IntersectionSummary } from "@/lib/types"
import * as XLSX from "xlsx"

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

function downloadXlsx(
  filename: string,
  hourlyData: Record<string, HourlyTotal[]>,
  countsData: Record<string, IntersectionCounts>
) {
  const wb = XLSX.utils.book_new()
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  // Sheet 1: Hourly Totals per intersection
  for (const [id, rows] of Object.entries(hourlyData)) {
    const name = countsData[id]?.name || id
    const header = [{ Hour: `Date: ${dateStr}`, Vehicles: "" as string | number }]
    const sheetData = rows.map((r) => ({ Hour: r.hour, Vehicles: r.total as string | number }))
    sheetData.push({ Hour: "Total", Vehicles: rows.reduce((s, r) => s + r.total, 0) })
    const ws = XLSX.utils.json_to_sheet([...header, ...sheetData])
    ws["!cols"] = [{ wch: 32 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws, `${name} Hourly`.slice(0, 31))
  }

  // Sheet 2: Per-lane classification counts per intersection
  for (const [id, counts] of Object.entries(countsData)) {
    const sheetRows: Record<string, string | number>[] = []
    const sortedLanes = Object.entries(counts.lanes).sort(([a], [b]) => {
      const ai = LANE_ORDER.indexOf(a.toLowerCase())
      const bi = LANE_ORDER.indexOf(b.toLowerCase())
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
    for (const [lane, data] of sortedLanes) {
      const row: Record<string, string | number> = { Lane: lane.charAt(0).toUpperCase() + lane.slice(1) }
      for (const cls of VEHICLE_CLASSES) {
        row[cls] = data.classes[cls] || 0
      }
      row["Total"] = data.total
      sheetRows.push(row)
    }
    // Grand total row
    const totalRow: Record<string, string | number> = { Lane: "Total" }
    for (const cls of VEHICLE_CLASSES) {
      totalRow[cls] = counts.classes[cls] || 0
    }
    totalRow["Total"] = counts.total
    sheetRows.push(totalRow)

    // Add date header row
    const headerRow: Record<string, string | number> = { Lane: `Date: ${dateStr}` }
    const ws = XLSX.utils.json_to_sheet([headerRow, ...sheetRows])
    ws["!cols"] = [{ wch: 32 }, ...VEHICLE_CLASSES.map(() => ({ wch: 12 })), { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws, `${counts.name} Counts`.slice(0, 31))
  }

  XLSX.writeFile(wb, filename)
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
                downloadXlsx(`traffic_analytics_${ts}.xlsx`, hourlyByIntersection, countsData)
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
