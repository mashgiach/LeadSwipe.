import { LeadSwiper } from "@/components/lead-swiper"
import { SideNav } from "@/components/side-nav"
import ProtectedRoute from "@/app/protected-route"

export default function Home() {
  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-background">
        <SideNav />
        <main className="flex-1 overflow-auto">
          <LeadSwiper />
        </main>
      </div>
    </ProtectedRoute>
  )
}
