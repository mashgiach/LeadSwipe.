"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Users, ArrowRight, Mail, Lock, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getSupabaseBrowserClient } from "@/lib/supabase"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [waitlistName, setWaitlistName] = useState("")
  const [waitlistEmail, setWaitlistEmail] = useState("")
  const [waitlistReason, setWaitlistReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await signIn(email, password)
      router.push("/")
    } catch (error: any) {
      setError("Failed to sign in. Please check your credentials.")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWaitlistRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsLoading(true)

    try {
      const supabase = getSupabaseBrowserClient()

      // Store the waitlist request in the database
      const { error: insertError } = await supabase.from("waitlist_requests").insert([
        {
          email: waitlistEmail,
          name: waitlistName,
          reason: waitlistReason,
          status: "pending",
          // created_at is automatically set by the database
        },
      ])

      if (insertError) {
        console.error("Error submitting waitlist request:", insertError)
        throw new Error("Failed to submit your request. Please try again.")
      }

      // Clear the form
      setWaitlistName("")
      setWaitlistEmail("")
      setWaitlistReason("")

      // Show success message
      setSuccess("Thank you! Your request has been submitted. We'll be in touch soon.")
    } catch (error: any) {
      setError(error.message || "Failed to submit your request. Please try again.")
      console.error("Waitlist request error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center shopify-gradient p-4">
      <div className="w-full max-w-md">
        <Card className="border-none shadow-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md">
              <Users className="h-8 w-8" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
              LeadSwipe
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Your AI-powered lead management platform
            </CardDescription>
          </CardHeader>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 rounded-md bg-gray-100 dark:bg-gray-800 p-1">
              <TabsTrigger
                value="login"
                className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="waitlist"
                className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
              >
                Join Waitlist
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn}>
                <CardContent className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>

                <CardFooter>
                  <Button type="submit" className="w-full shopify-button" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                        Logging in...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        Login <ArrowRight className="ml-2 h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="waitlist">
              <form onSubmit={handleWaitlistRequest}>
                <CardContent className="space-y-4 pt-2">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-2">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      <span className="font-medium">New signups are currently closed.</span> Join our waitlist to be
                      notified when we open registrations again.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waitlist-name" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <Input
                      id="waitlist-name"
                      value={waitlistName}
                      onChange={(e) => setWaitlistName(e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waitlist-email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="waitlist-email"
                      type="email"
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="waitlist-reason" className="text-sm font-medium">
                      Why do you want to join LeadSwipe?
                    </Label>
                    <Textarea
                      id="waitlist-reason"
                      value={waitlistReason}
                      onChange={(e) => setWaitlistReason(e.target.value)}
                      placeholder="Tell us about your business and how you plan to use LeadSwipe..."
                      className="min-h-[100px]"
                      required
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert className="py-2 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                      <AlertDescription className="text-green-800 dark:text-green-300">{success}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>

                <CardFooter>
                  <Button type="submit" className="w-full shopify-button" disabled={isLoading}>
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                        Submitting...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        Join Waitlist <ArrowRight className="ml-2 h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  )
}
