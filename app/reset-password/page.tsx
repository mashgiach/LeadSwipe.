"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { AlertCircle, ArrowLeft, Check, Loader2 } from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import Link from "next/link"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset states
    setError(null)
    setSuccess(false)

    setIsLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      })

      if (error) {
        throw new Error(error.message)
      }

      // Success
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || "Failed to send reset password email")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <main className="flex-1 overflow-auto">
        <div className="flex flex-col h-full">
          <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex items-center">
            <Link href="/login" className="mr-4">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Reset Password</h1>
          </div>

          <div className="flex-1 p-4 md:p-6">
            <div className="max-w-md mx-auto">
              <Card className="border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm rounded-md">
                <div className="p-4 md:p-6">
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-2 mt-0.5" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  {success ? (
                    <div className="text-center py-6">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                        <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Check your email</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        We've sent a password reset link to <strong>{email}</strong>. Please check your inbox and follow
                        the instructions to reset your password.
                      </p>
                      <Button
                        onClick={() => router.push("/login")}
                        className="bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        Return to Login
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                          Forgot your password?
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Enter your email address and we'll send you a link to reset your password.
                        </p>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email Address
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full border-gray-300 dark:border-gray-700"
                            placeholder="Enter your email"
                          />
                        </div>

                        <div className="pt-2">
                          <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-800 dark:hover:bg-gray-700"
                          >
                            {isLoading ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending Reset Link...
                              </>
                            ) : (
                              "Send Reset Link"
                            )}
                          </Button>
                        </div>
                      </form>

                      <div className="mt-6 text-center">
                        <Link
                          href="/login"
                          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium"
                        >
                          Back to Login
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
