"use client"

import { useEffect, useState } from "react"
import { CheckCircle2 } from "lucide-react"
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
import { cn } from "@/lib/utils"

type PaymentModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (customerId: string, amount: number) => void
  customer?: Customer | null
}

type PaymentResult = {
  customerName: string
  amount: number
  newBalance: number
  date: Date
}

function formatDatetime(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function buildWhatsAppMessage(result: PaymentResult): string {
  return [
    `\u{1F4B0} *Oxxito - Abono Registrado*`,
    `─────────────────`,
    `\u{1F464} Cliente: ${result.customerName}`,
    `─────────────────`,
    `\u{1F4B5} Monto abonado: ${formatCurrency(result.amount)}`,
    `\u{1F4CB} Saldo restante: ${formatCurrency(result.newBalance)}`,
    `─────────────────`,
    `\u{1F4C5} ${formatDatetime(result.date)}`,
    `Gracias por su pago \u{1F64F}`,
  ].join("\n")
}

export function PaymentModal({ open, onOpenChange, onConfirm, customer }: PaymentModalProps) {
  const [amount, setAmount] = useState("")
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null)

  useEffect(() => {
    if (open) {
      setAmount("")
      setPaymentError(null)
      setIsSubmitting(false)
      setPaymentResult(null)
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

    const newBalance = Math.max(customer.balance - parsed, 0)

    const { error } = await supabase
      .from("clientes")
      .update({ saldo_pendiente: newBalance })
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

    setPaymentResult({
      customerName: customer.name,
      amount: parsed,
      newBalance,
      date: new Date(),
    })

    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
        {paymentResult ? (
          /* Success view */
          <div className="flex flex-col gap-5 py-2">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-500/15">
                <CheckCircle2 className="size-9 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Abono Registrado</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatDatetime(paymentResult.date)}
                </p>
              </div>
            </div>

            <div className="w-full rounded-2xl border border-border bg-secondary/40 p-4 font-mono text-sm">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Resumen
              </p>
              <div className="space-y-2 text-foreground">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="truncate text-right font-medium">{paymentResult.customerName}</span>
                </div>
                <div className="my-2 border-t border-border" />
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Monto abonado</span>
                  <span className="font-semibold text-green-500">{formatCurrency(paymentResult.amount)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Saldo restante</span>
                  <span className={cn("font-semibold", paymentResult.newBalance > 0 ? "text-amber-400" : "text-green-500")}>
                    {formatCurrency(paymentResult.newBalance)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(paymentResult))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-500 active:bg-green-700"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Compartir por WhatsApp
              </a>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                className="w-full rounded-xl"
              >
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          /* Payment form */
          <>
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
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
