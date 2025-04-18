"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import type { Lead } from "@/services/lead-service"
import { useToast } from "@/contexts/toast-context"
import { useRouter } from "next/navigation"

export default function MatchedLeadsPage() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const { addToast } = useToast()
  const router = useRouter()

  useEffect(() => {
    router.push("/leads/matched")
  }, [router])

  return null
}
