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
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Select Intersection</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border-t border-border pt-4">
          <p className="text-sm text-muted-foreground mb-3">Intersections</p>
          <div className="flex flex-wrap gap-2">
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
        </div>
      </CardContent>
    </Card>
  )
}
