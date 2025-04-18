"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, Check, Loader2, Save } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { updateSettings, type Settings } from "@/services/settings-service"
import { getUserSettings, updateUserSettings, type UserSettings } from "@/services/user-settings-service"
import { getUserProfile, updateProfile, type UserProfile } from "@/services/user-profile-service"
import { KeywordFilterDialog } from "@/components/keyword-filter-dialog"
import { useToast } from "@/contexts/toast-context"

interface SettingsFormProps {
  settings: Settings | null
  isLoading: boolean
  activeTab: string
}

const AI_MODELS = [
  { value: "llama3-8b-8192", label: "Llama 3 8B" },
  { value: "llama3-70b-8192", label: "Llama 3 70B" },
  { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
  { value: "gemma-7b-it", label: "Gemma 7B" },
]

export function SettingsForm({ settings, isLoading, activeTab }: SettingsFormProps) {
  const { user } = useAuth()
  const router = useRouter()
  const { setTheme, theme: currentTheme } = useTheme()
  const { toast } = useToast()

  const [groqApiKey, setGroqApiKey] = useState(settings?.groq_api_key || "")
  const [aiModel, setAiModel] = useState(settings?.ai_model || "llama3-8b-8192")
  const [systemMessage, setSystemMessage] = useState(settings?.system_message || "")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // User settings
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [isLoadingUserSettings, setIsLoadingUserSettings] = useState(true)
  const [notificationEmail, setNotificationEmail] = useState(true)
  const [notificationPush, setNotificationPush] = useState(true)
  const [theme, setThemeState] = useState(currentTheme || "light")
  const [keywords, setKeywords] = useState<string[]>([])
  const [showKeywordDialog, setShowKeywordDialog] = useState(false)
  const [manualThemeChange, setManualThemeChange] = useState(false)

  // User profile
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [fullName, setFullName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user) return

      setIsLoadingUserSettings(true)
      try {
        const settings = await getUserSettings(user.id)
        if (settings) {
          setUserSettings(settings)
          setNotificationEmail(settings.notification_email)
          setNotificationPush(settings.notification_push)
          // Don't override the current theme with database value if user has made manual changes
          if (!manualThemeChange) {
            setThemeState(currentTheme || "light")
          }
          setKeywords(settings.keywords || [])
        }
      } catch (error) {
        console.error("Error fetching user settings:", error)
      } finally {
        setIsLoadingUserSettings(false)
      }
    }

    const fetchUserProfile = async () => {
      if (!user) return

      setIsLoadingProfile(true)
      try {
        const profile = await getUserProfile(user.id)
        if (profile) {
          setUserProfile(profile)
          setFullName(profile.full_name || "")
          setAvatarUrl(profile.avatar_url)
          setUserEmail(profile.email || user.email || "")
        } else if (user.email) {
          setUserEmail(user.email)
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
        if (user.email) {
          setUserEmail(user.email)
        }
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchUserProfile()
    fetchUserSettings()
  }, [user, currentTheme])

  const handleSaveAISettings = async () => {
    if (!user) return

    setIsSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      await updateSettings(user.id, {
        groq_api_key: groqApiKey,
        ai_model: aiModel,
        system_message: systemMessage,
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error saving settings:", error)
      setError("Failed to save settings. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveUserSettings = async () => {
    if (!user) return

    setIsSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      await updateUserSettings(user.id, {
        notification_email: notificationEmail,
        notification_push: notificationPush,
        theme: theme,
        keywords: keywords,
      })

      // Reset manual theme change flag after saving
      setManualThemeChange(false)

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error("Error saving user settings:", error)
      setError("Failed to save settings. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user) return

    setIsSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      const result = await updateProfile(user.id, {
        full_name: fullName,
      })

      if (result) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        throw new Error("Failed to update profile")
      }
    } catch (error) {
      console.error("Error saving profile:", error)
      setError("Failed to save profile. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeywordsChange = (newKeywords: string[]) => {
    setKeywords(newKeywords)
    setShowKeywordDialog(false)
  }

  const handleThemeChange = (newTheme: string) => {
    // Mark that we've manually changed the theme
    setManualThemeChange(true)

    // Update local state
    setThemeState(newTheme)

    // Apply theme change immediately
    setTheme(newTheme)
  }

  // Keep dropdown in sync with actual theme
  useEffect(() => {
    if (currentTheme && !isLoadingUserSettings) {
      setThemeState(currentTheme)
    }
  }, [currentTheme, isLoadingUserSettings])

  if (isLoading || isLoadingUserSettings || isLoadingProfile) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
      </div>
    )
  }

  if (activeTab === "profile") {
    return (
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-md mb-4">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Full Name
            </Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </Label>
            <Input
              id="email"
              value={userEmail}
              disabled
              className="w-full bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">Email cannot be changed</p>
          </div>

          <div className="pt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Preferences</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notification-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email Notifications
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Receive notifications via email</p>
                </div>
                <Switch id="notification-email" checked={notificationEmail} onCheckedChange={setNotificationEmail} />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notification-push" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Push Notifications
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Receive push notifications in browser</p>
                </div>
                <Switch id="notification-push" checked={notificationPush} onCheckedChange={setNotificationPush} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Theme
                </Label>
                <Select value={theme} onValueChange={handleThemeChange}>
                  <SelectTrigger id="theme" className="w-full border-gray-300 dark:border-gray-700">
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Choose your preferred theme for the application.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  if (activeTab === "ai") {
    return (
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-md mb-4">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="groq-api-key" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Groq API Key
            </Label>
            <Input
              id="groq-api-key"
              type="password"
              value={groqApiKey}
              onChange={(e) => setGroqApiKey(e.target.value)}
              placeholder="Enter your Groq API key"
              className="w-full border-gray-300 dark:border-gray-700"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Get your API key from{" "}
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-600 hover:underline dark:text-red-400"
              >
                Groq Console
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-model" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              AI Model
            </Label>
            <Select value={aiModel} onValueChange={setAiModel}>
              <SelectTrigger id="ai-model" className="w-full border-gray-300 dark:border-gray-700">
                <SelectValue placeholder="Select an AI model" />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select the AI model to use for generating messages.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="system-message" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              System Message (Instructions for AI)
            </Label>
            <Textarea
              id="system-message"
              value={systemMessage}
              onChange={(e) => setSystemMessage(e.target.value)}
              placeholder="Enter custom instructions for the AI model"
              className="min-h-[150px] w-full border-gray-300 dark:border-gray-700"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Customize how the AI generates messages. Leave blank to use the default instructions.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveAISettings}
            disabled={isSaving}
            className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  if (activeTab === "keywords") {
    return (
      <div className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-3 rounded-md mb-4">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <div className="flex items-center space-x-2 mb-4">
                <h2 className="text-xl font-semibold">Global Keywords</h2>
                <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs px-2 py-1 rounded-md">
                  Beta
                </span>
              </div>
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  This feature is in beta and may have bugs. Please report any issues you encounter.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKeywordDialog(true)}
              className="border-gray-300 dark:border-gray-700"
            >
              Manage Keywords
            </Button>
          </div>

          <div className="border border-gray-200 dark:border-gray-800 rounded-md p-4 min-h-[100px] bg-white dark:bg-gray-900">
            {keywords.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
                No keywords added yet
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSaveUserSettings}
            disabled={isSaving}
            className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <KeywordFilterDialog
          open={showKeywordDialog}
          onClose={() => setShowKeywordDialog(false)}
          keywords={keywords}
          onKeywordsChange={handleKeywordsChange}
        />
      </div>
    )
  }

  return null
}
