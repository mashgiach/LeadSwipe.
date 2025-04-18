"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { useAuth } from "@/contexts/auth-context"
import { getUserSettings } from "@/services/user-settings-service"

// Create a global variable to track if the theme has been manually changed
let manualThemeChange = false

export function ThemeSync() {
  const { user } = useAuth()
  const { setTheme } = useTheme()
  const [hasInitialized, setHasInitialized] = useState(false)

  useEffect(() => {
    const syncUserTheme = async () => {
      if (!user || manualThemeChange || hasInitialized) return

      try {
        const settings = await getUserSettings(user.id)
        if (settings?.theme) {
          // Apply the theme from user settings
          setTheme(settings.theme)
        } else {
          // If no theme is set in user settings, use light theme
          setTheme("light")
        }
        setHasInitialized(true)
      } catch (error) {
        console.error("Error fetching user theme:", error)
        // Default to light theme if there's an error
        setTheme("light")
        setHasInitialized(true)
      }
    }

    syncUserTheme()
  }, [user, setTheme, hasInitialized])

  // This component doesn't render anything
  return null
}

// Export a function to mark that the theme has been manually changed
export function setManualThemeChange(value: boolean) {
  manualThemeChange = value
}

export function getManualThemeChange() {
  return manualThemeChange
}
