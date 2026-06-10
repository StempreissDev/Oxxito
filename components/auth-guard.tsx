"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

const PUBLIC_ROUTES = ["/login"]

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const isPublic = PUBLIC_ROUTES.includes(pathname)

      if (!session && !isPublic) {
        router.replace("/login")
        return
      }

      if (session && isPublic) {
        router.replace("/")
        return
      }

      setChecking(false)
    })

    return () => subscription.unsubscribe()
  }, [pathname, router])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  return <>{children}</>
}
