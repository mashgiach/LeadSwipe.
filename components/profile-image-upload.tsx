"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Loader2, Trash } from "lucide-react"
import { updateProfile } from "@/services/user-profile-service"
import { useAuth } from "@/contexts/auth-context"

interface ProfileImageUploadProps {
  avatarUrl?: string | null
  onUpdate?: (url: string | null) => void
}

export function ProfileImageUpload({ avatarUrl: initialAvatarUrl, onUpdate }: ProfileImageUploadProps) {
  const { user } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update local state when prop changes
  useEffect(() => {
    if (initialAvatarUrl !== undefined) {
      setAvatarUrl(initialAvatarUrl)
    }
  }, [initialAvatarUrl])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return

    const file = e.target.files[0]
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // Convert file to base64 for storage
      // In a production app, you'd use a proper file upload service
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string
          const result = await updateProfile(user.id, { avatar_url: base64String })
          if (result) {
            setAvatarUrl(base64String)
            // Only call onUpdate if it exists
            if (typeof onUpdate === "function") {
              onUpdate(base64String)
            }
          } else {
            throw new Error("Failed to update profile image")
          }
        } catch (error) {
          console.error("Error updating profile image:", error)
          setError("Failed to update profile image. Please try again.")
        } finally {
          setIsUploading(false)
        }
      }
      reader.onerror = () => {
        setError("Failed to read image file")
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error) {
      console.error("Error reading file:", error)
      setError("Failed to read image file")
      setIsUploading(false)
    }
  }

  const handleRemoveImage = async () => {
    if (!user) return

    setIsUploading(true)
    setError(null)

    try {
      const result = await updateProfile(user.id, { avatar_url: null })
      if (result) {
        setAvatarUrl(null)
        // Only call onUpdate if it exists
        if (typeof onUpdate === "function") {
          onUpdate(null)
        }
      } else {
        throw new Error("Failed to remove profile image")
      }
    } catch (error) {
      console.error("Error removing profile image:", error)
      setError("Failed to remove profile image. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "U"

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Avatar className="h-24 w-24 border-2 border-blue-200 dark:border-blue-800">
          <AvatarImage src={avatarUrl || "/default-profile.png"} alt="Profile" />
          <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xl">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-card border border-border shadow-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Uploading...
            </>
          ) : (
            "Change Image"
          )}
        </Button>
        {avatarUrl && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs text-destructive hover:bg-destructive/10"
            onClick={handleRemoveImage}
            disabled={isUploading}
          >
            <Trash className="mr-1 h-3 w-3" /> Remove
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        disabled={isUploading}
      />
    </div>
  )
}
