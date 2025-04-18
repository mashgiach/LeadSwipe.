"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function NotificationsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to home page since we're using a popup for notifications now
    router.push("/")
  }, [router])

  return null
}
