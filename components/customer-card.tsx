"use client"

import { Phone, HandCoins, ShoppingCart, CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type Customer } from "@/lib/customers"
import { formatCurrency } from "@/lib/types"
import { cn } from "@/lib/utils"

type CustomerCardProps = {
  customer: Customer
  onRegisterPayment: (customer: Customer) => void
  onNewSale: (customer: Customer) => void
  onOpenProfile: (customer: Customer) => void
}

export function CustomerCard({ customer, onRegisterPayment, onNewSale, onOpenProfile }: CustomerCardProps) {
  const hasDebt = customer.balance > 0

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <button
        type="button"
        onClick={() => onOpenProfile(customer)}
        className="flex items-start justify-between gap-3 rounded-lg text-left transition-opacity hover:opacity-80"
        aria-label={`Ver perfil de ${customer.name}`}
      >
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold leading-tight text-card-foreground">
            {customer.name}
          </h3>
          <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Phone className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{customer.phone}</span>
          </div>
          <div className="mt-2.5">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                hasDebt
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-accent/15 text-accent",
              )}
            >
              {hasDebt ? (
                <AlertCircle className="size-3" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="size-3" aria-hidden="true" />
              )}
              {hasDebt ? "Con deuda" : "Al corriente"}
            </span>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
          <p
            className={cn(
              "mt-0.5 text-xl font-bold tracking-tight",
              hasDebt ? "text-foreground" : "text-accent",
            )}
          >
            {formatCurrency(customer.balance)}
          </p>
        </div>
      </button>

      <div className="flex items-center gap-2.5">
        <Button
          variant="secondary"
          onClick={() => onRegisterPayment(customer)}
          disabled={!hasDebt}
          className="flex-1 gap-1.5 rounded-xl"
        >
          <HandCoins className="size-4" />
          Registrar Abono
        </Button>
        <Button
          onClick={() => onNewSale(customer)}
          className="flex-1 gap-1.5 rounded-xl"
        >
          <ShoppingCart className="size-4" />
          Nueva Venta
        </Button>
      </div>
    </div>
  )
}
