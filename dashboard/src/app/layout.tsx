// the root layout lmao
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { MotionProvider } from "@/components/providers/motion-provider"
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
  title: "FabOps Sentinel — 3d printer watchdog lol",
}

// the main layout wrapper thingy
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
        <MotionProvider>
          <div className="flex min-h-screen">
            {/* sidebar left */}
            <Sidebar />
            <div className="flex flex-1 flex-col pl-60">
              {/* header + main content area */}
              <Header />
              <main className="flex-1 overflow-y-auto p-6 pt-20">
                {children}
              </main>
            </div>
          </div>
        </MotionProvider>
      </body>
    </html>
  )
}
