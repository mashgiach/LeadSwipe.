"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, MessageSquare, RefreshCw } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { getSettings } from "@/services/settings-service"
import { generateMessage } from "@/services/ai-service"
import { getTextDirectionClass } from "@/lib/utils"
import type { Lead } from "@/services/lead-service"

interface MessageGeneratorDialogProps {
  lead: Lead
  open: boolean
  onClose: () => void
  onSend: () => void
}

export function MessageGeneratorDialog({ lead, open, onClose, onSend }: MessageGeneratorDialogProps) {
  const { user } = useAuth()
  const [message, setMessage] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasApiKey, setHasApiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const name = lead.first_name && lead.last_name ? `${lead.first_name} ${lead.last_name}` : lead.name || "Unknown"

  useEffect(() => {
    const checkApiKey = async () => {
      if (!user) return

      try {
        const settings = await getSettings(user.id)
        setHasApiKey(!!settings?.groq_api_key)

        if (settings?.groq_api_key) {
          handleGenerateMessage()
        }
      } catch (error) {
        console.error("Error checking API key:", error)
        setHasApiKey(false)
      }
    }

    if (open) {
      checkApiKey()
    }
  }, [open, user])

  const handleGenerateMessage = async () => {
    if (!user) return

    setIsGenerating(true)
    setError(null)

    try {
      const generatedMessage = await generateMessage(user.id, lead)
      setMessage(generatedMessage)
    } catch (error) {
      console.error("Error generating message:", error)
      setError("Failed to generate message. Please check your API key in settings.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSend = () => {
    onSend()
    onClose()
  }

  // Determine if the message contains Hebrew text
  const messageDirectionClass = getTextDirectionClass(message)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md border-border/30 bg-card shadow-lg shopify-card">
        <DialogHeader>
          <DialogTitle className="text-blue-700 dark:text-blue-400">
            Message to <span className={getTextDirectionClass(name)}>{name}</span>
          </DialogTitle>
          <DialogDescription>
            {hasApiKey
              ? "Generate a personalized message based on the lead's information."
              : "Please add your Groq API key in settings to generate messages."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</div>}

          <Textarea
            placeholder="Your message will appear here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`min-h-[200px] shopify-input ${messageDirectionClass}`}
            disabled={isGenerating}
          />

          {!hasApiKey && (
            <div className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 p-3 rounded-md">
              To generate AI messages, please add your Groq API key in the settings page.
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={handleGenerateMessage}
            disabled={isGenerating || !hasApiKey}
            className="mb-2 sm:mb-0 shopify-button"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="shopify-button">
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={!message.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white shopify-button"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Message
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
