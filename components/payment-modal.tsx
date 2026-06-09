"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { type Customer } from "@/lib/customers"
import { formatCurrency } from "@/lib/types"
import { supabase } from "@/lib/supabase"

type PaymentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (customerId: string, amount: number) => void
  customer?: Customer | null
}

export function PaymentModal({ open, onOpenChange, onConfirm, customer }: PaymentModalProps) {
  const [amount, setAmount] = useState("")
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setAmount("")
      setPaymentError(null)
      setIsSubmitting(false)
    }
  }, [open])

  if (!customer) return null

  const parsed = Number.parseFloat(amount) || 0
  const remaining = Math.max(customer.balance - parsed, 0)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!customer) return

    if (parsed <= 0) {
      setPaymentError("El monto debe ser mayor a 0.")
      return
    }
    if (parsed > customer.balance) {
      setPaymentError("El abono no puede ser mayor al saldo pendiente.")
      return
    }

    setIsSubmitting(true)
    setPaymentError(null)

    const { error } = await supabase
      .from("clientes")
      .update({ saldo_pendiente: customer.balance - parsed })
      .eq("id", customer.id)

    if (error) {
      setPaymentError("No se pudo registrar el abono. Intenta de nuevo.")
      setIsSubmitting(false)
      return
    }

    const { error: abonoError } = await supabase
      .from("abonos")
      .insert([{ cliente_id: customer.id, monto: parsed }])

    if (abonoError) {
      setPaymentError("Saldo actualizado pero no se pudo registrar el abono en el historial.")
      setIsSubmitting(false)
      return
    }

    onConfirm(customer.id, parsed)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Registrar Abono</DialogTitle>
          <DialogDescription>
            Abono para <span className="font-medium text-foreground">{customer.name}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-1">
          <div className="rounded-xl bg-secondary p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Saldo actual</span>
              <span className="font-semibold text-foreground">
                {formatCurrency(customer.balance)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Saldo restante</span>
              <span className="font-semibold text-accent">{formatCurrency(remaining)}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="amount" className="text-sm font-medium text-foreground">
              Monto a pagar
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground">
                $
              </span>
              <input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                max={customer.balance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="h-16 w-full rounded-xl border border-input bg-background pl-9 pr-4 text-3xl font-bold tracking-tight text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          {paymentError && (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {paymentError}
            </p>
          )}

          <DialogFooter className="flex-row justify-end gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={parsed <= 0 || isSubmitting}>
              {isSubmitting ? "Guardando…" : "Confirmar Pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
