"use client"

import { Phone, HandCoins, ShoppingCart, CheckCircle2, AlertCircle, MoreVertical, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type Customer } from "@/lib/customers"
import { formatCurrency } from "@/lib/types"
import { cn } from "@/lib/utils"

type CustomerCardProps = {
  customer: Customer
  onRegisterPayment: (customer: Customer) => void
  onNewSale: (customer: Customer) => void
  onOpenProfile: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export function CustomerCard({ customer, onRegisterPayment, onNewSale, onOpenProfile, onDelete }: CustomerCardProps) {
  const hasDebt = customer.balance > 0

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onOpenProfile(customer)}
          className="min-w-0 flex-1 rounded-lg text-left transition-opacity hover:opacity-80"
          aria-label={`Ver perfil de ${customer.name}`}
        >
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
        </button>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="text-xs text-muted-foreground">Saldo pendiente</p>
          <p
            className={cn(
              "text-xl font-bold tracking-tight",
              hasDebt ? "text-foreground" : "text-accent",
            )}
          >
            {formatCurrency(customer.balance)}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Acciones para ${customer.name}`}
          >
            <MoreVertical className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => onDelete(customer)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Eliminar cliente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
