import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "FabOps Sentinel — AI Observability",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col pl-60">
            <Header title="Dashboard" />
            <main className="flex-1 overflow-y-auto p-6 pt-20">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
