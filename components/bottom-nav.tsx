"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Package, Users } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/", label: "Inventario", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky bottom-0 z-20 mx-auto w-full max-w-md border-t border-border bg-background/90 backdrop-blur-md">
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-5" />
              {tab.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
