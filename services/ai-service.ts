"use client"
import { getSettings } from "@/services/settings-service"
import { createNotification } from "@/services/notification-service"
import type { Lead } from "@/services/lead-service"

export async function generateMessage(userId: string, lead: Lead): Promise<string> {
  // Get user settings
  const settings = await getSettings(userId)

  if (!settings?.groq_api_key) {
    throw new Error("Groq API key not found. Please add it in settings.")
  }

  const name = lead.first_name && lead.last_name ? `${lead.first_name} ${lead.last_name}` : lead.name || "Unknown"

  const content = lead.comment_text || lead.post_text || lead.description || ""

  // Default system message if none is provided
  const defaultSystemMessage =
    "You are a helpful assistant that generates personalized messages for Facebook leads. Keep messages friendly, professional, and under 200 words. Focus on building rapport and addressing the lead's specific needs or comments."

  // Use custom system message if available
  const systemMessage = settings.system_message || defaultSystemMessage

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.groq_api_key}`,
      },
      body: JSON.stringify({
        model: settings.ai_model,
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: `Generate a personalized message to send to ${name} who wrote: "${content}"`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`API error: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const generatedMessage = data.choices[0].message.content.trim()

    // Create notification for message generation
    await createNotification({
      user_id: userId,
      type: "message_generated",
      title: "Message Generated",
      message: `AI message generated for ${name}`,
      lead_id: lead.id,
      action_url: "/leads",
    })

    return generatedMessage
  } catch (error) {
    console.error("Error generating message:", error)
    throw new Error("Failed to generate message. Please check your API key and try again.")
  }
}
