import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Fira_Code } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] })
const mono = Fira_Code({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MALOLOS Traffic Control System",
  description: "Vehicle counting and dynamic traffic light system for improved traffic flow",
}

export const viewport: Viewport = {
  themeColor: "#1a1625",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
        <Analytics />
      </body>
    </html>
  )
}
