import type React from "react"
import "@/app/globals.css"
import type { Metadata } from "next"
import { Inter, Heebo } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeSync } from "@/components/theme-sync"
import { ToastProvider } from "@/contexts/toast-context"

const inter = Inter({ subsets: ["latin"] })
const heebo = Heebo({ subsets: ["hebrew"], variable: "--font-heebo" })

export const metadata: Metadata = {
  title: "LeadSwipe",
  description: "Tinder-like app for business leads",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${heebo.variable}`}>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ThemeSync />
              {children}
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
