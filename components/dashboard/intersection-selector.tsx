"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { IntersectionSummary } from "@/lib/types"

interface IntersectionSelectorProps {
  intersections: IntersectionSummary[]
  selectedId: string
  onSelect: (id: string) => void
}

export function IntersectionSelector({
  intersections,
  selectedId,
  onSelect,
}: IntersectionSelectorProps) {
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-foreground whitespace-nowrap">Select Intersection:</span>
          {intersections.map((intersection) => (
            <Button
              key={intersection.id}
              size="sm"
              variant={selectedId === intersection.id ? "default" : "outline"}
              onClick={() => onSelect(intersection.id)}
            >
              {intersection.name}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
