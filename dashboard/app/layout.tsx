import type { Metadata } from "next"
import "./globals.css"
import { ConditionalLayout } from "./conditional-layout"
import { ServiceWorkerRegistration } from "@/components/sw-registration"

export const metadata: Metadata = {
  title: "ColorIq — Stop Guessing. Start Formulating.",
  description: "AI-powered hair color formulation for professional stylists.",
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased" style={{ background: '#0A0A0F', color: '#F5F5F7' }}>
        <ServiceWorkerRegistration />
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
      </body>
    </html>
  )
}
