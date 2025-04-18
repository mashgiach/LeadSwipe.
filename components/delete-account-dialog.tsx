"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, CheckCircle2 } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"

export function DeleteAccountDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const handleSubmitRequest = async () => {
    if (confirmation !== "DELETE") {
      setError("Please type DELETE to confirm")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowserClient()

      // Submit deletion request to a new table
      const { error: insertError } = await supabase.from("account_deletion_requests").insert({
        user_id: user?.id,
        user_email: user?.email,
        reason: reason,
        status: "pending",
        requested_at: new Date().toISOString(),
      })

      if (insertError) {
        throw new Error(insertError.message)
      }

      // Show success state
      setIsSubmitted(true)

      // Close dialog after 3 seconds
      setTimeout(() => {
        setIsOpen(false)
        // Reset form after closing
        setTimeout(() => {
          setIsSubmitted(false)
          setReason("")
          setConfirmation("")
        }, 300)
      }, 3000)
    } catch (error: any) {
      console.error("Error submitting deletion request:", error)
      setError(error.message || "An unexpected error occurred. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Request Account Deletion</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-white">
        {isSubmitted ? (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-medium text-gray-900">Request Submitted</h3>
            <p className="text-gray-500 mt-2">
              Your account deletion request has been submitted. Our team will review it and contact you via email.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request Account Deletion</DialogTitle>
              <DialogDescription>
                Submit a request to delete your account. Our team will review your request and process it within 7
                business days.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason for leaving</Label>
                <Textarea
                  id="reason"
                  placeholder="Please tell us why you want to delete your account"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-[100px]"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmation" className="text-red-500">
                  Type DELETE to confirm
                </Label>
                <Input
                  id="confirmation"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  className="border-red-300 focus-visible:ring-red-500"
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleSubmitRequest}
                disabled={isSubmitting || !reason || confirmation !== "DELETE"}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
