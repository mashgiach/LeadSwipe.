"use client"

import { useState } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SUBSCRIPTION_PLANS, type SubscriptionPlan, upgradeSubscription } from "@/services/account-service"
import { useToast } from "@/hooks/use-toast"

interface SubscriptionPlansProps {
  currentPlan: SubscriptionPlan
  onUpgrade?: () => void
}

export function SubscriptionPlans({ currentPlan, onUpgrade }: SubscriptionPlansProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState<SubscriptionPlan | null>(null)

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (plan === currentPlan) return

    setIsProcessing(plan)
    try {
      const { success, error } = await upgradeSubscription(plan)

      if (success) {
        toast({
          title: "Subscription upgraded",
          description: `You have successfully upgraded to the ${SUBSCRIPTION_PLANS[plan].name} plan.`,
        })
        if (onUpgrade) onUpgrade()
      } else {
        toast({
          title: "Upgrade failed",
          description: error?.message || "There was an error upgrading your subscription. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Upgrade failed",
        description: "There was an error upgrading your subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Invitation-only banner */}
      <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-6 rounded-lg border border-primary/20">
        <h2 className="text-2xl font-bold text-center mb-2">Invitation Only Platform</h2>
        <p className="text-center text-muted-foreground">
          Currently, our platform is available by invitation only. In the future, we'll offer the following subscription
          plans to meet your needs.
        </p>
      </div>

      {/* Future plans section */}
      <div>
        <h3 className="text-xl font-semibold mb-6 text-center">Future Subscription Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-75">
          {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => {
            const planKey = key as SubscriptionPlan
            const isCurrentPlan = planKey === currentPlan

            return (
              <Card
                key={key}
                className={`flex flex-col ${plan.recommended ? "border-primary/40 shadow-sm" : ""} bg-muted/30`}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription className="mt-1.5">{plan.description}</CardDescription>
                    </div>
                    {plan.recommended ? (
                      <Badge variant="outline" className="border-primary/40 text-primary/80">
                        Recommended
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="ml-2">
                      Coming Soon
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-muted-foreground">${plan.price}</span>
                    {plan.price > 0 && <span className="text-muted-foreground">/month</span>}
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        {feature.included ? (
                          <Check className="h-5 w-5 text-green-500/70 mr-2 shrink-0" />
                        ) : (
                          <X className="h-5 w-5 text-gray-300 mr-2 shrink-0" />
                        )}
                        <span className={feature.included ? "text-muted-foreground" : "text-muted-foreground/60"}>
                          {feature.name}
                          {feature.limit && feature.included && (
                            <span className="text-muted-foreground/60 text-sm"> ({feature.limit})</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline" disabled={true}>
                    Coming Soon
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Current access note */}
      <div className="text-center text-muted-foreground text-sm">
        <p>Your current access is provided through invitation. Contact your account manager for any questions.</p>
      </div>
    </div>
  )
}
