"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Minus, Plus, ShoppingCart, Check, Package, CheckCircle2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { type Customer } from "@/lib/customers"
import { formatCurrency, type Product } from "@/lib/types"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type PaymentType = "completo" | "despues" | "parcial" | null

type SaleResult = {
  customerName: string
  productName: string
  quantity: number
  total: number
  paymentType: "completo" | "despues" | "parcial"
  partialAmount: number
  newBalance: number
  date: Date
}

type SaleModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (
    customerId: string,
    sale: { total: number; productName: string; quantity: number; balanceDelta: number },
  ) => void
  customer?: Customer | null
}

function formatDatetime(d: Date) {
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, "0")
  const min = String(d.getMinutes()).padStart(2, "0")
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function buildWhatsAppMessage(result: SaleResult): string {
  const abonoLine =
    result.paymentType === "completo"
      ? "Pagó completo"
      : result.paymentType === "despues"
      ? "Cargado a cuenta"
      : formatCurrency(result.partialAmount)

  return [
    `🛒 *Oxxito - Venta Registrada*`,
    `─────────────────`,
    `👤 Cliente: ${result.customerName}`,
    `📦 Producto: ${result.productName} x${result.quantity}`,
    `─────────────────`,
    `💰 Total venta: ${formatCurrency(result.total)}`,
    `✅ Abono: ${abonoLine}`,
    `📋 Saldo pendiente: ${formatCurrency(result.newBalance)}`,
    `─────────────────`,
    `📅 ${formatDatetime(result.date)}`,
    `Gracias por su compra 🙏`,
  ].join("\n")
}

export function SaleModal({
  open,
  onOpenChange,
  onConfirm,
  customer,
}: SaleModalProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [paymentType, setPaymentType] = useState<PaymentType>(null)
  const [partialAmount, setPartialAmount] = useState("")
  const [saleError, setSaleError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery("")
    setSelectedId(null)
    setQuantity(1)
    setPaymentType(null)
    setPartialAmount("")
    setSaleError(null)
    setIsSubmitting(false)
    setSaleResult(null)

    async function fetchProducts() {
      const { data, error } = await supabase
        .from("productos")
        .select("*")
        .gt("stock", 0)

      if (error) {
        console.error("Error al cargar productos:", error.message)
        return
      }

      if (data) {
        setProducts(
          data.map((p: any) => ({
            id: p.id,
            name: p.nombre,
            price: Number(p.precio),
            stock: p.stock,
          }))
        )
      }
    }

    fetchProducts()
  }, [open])

  const selected = useMemo(
    () => products.find((p) => p.id === selectedId) ?? null,
    [products, selectedId],
  )

  const available = useMemo(
    () => products.filter((p) => p.stock > 0),
    [products],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return available.filter((p) => p.name.toLowerCase().includes(q))
  }, [available, query])

  const maxQty = selected?.stock ?? 1
  const total = selected ? selected.price * quantity : 0
  const parsedPartial = parseFloat(partialAmount) || 0
  const isPartialValid = parsedPartial > 0 && parsedPartial < total

  const canConfirm =
    !!selected &&
    !!paymentType &&
    !isSubmitting &&
    (paymentType !== "parcial" || isPartialValid)

  if (!customer) return null

  function selectProduct(product: Product) {
    setSelectedId(product.id)
    setQuantity(1)
    setPaymentType(null)
    setPartialAmount("")
    setSaleError(null)
  }

  function decrease() {
    setQuantity((q) => Math.max(1, q - 1))
  }

  function increase() {
    setQuantity((q) => Math.min(maxQty, q + 1))
  }

  async function handleConfirm() {
    if (!selected || !customer || !paymentType) return

    if (quantity > selected.stock) {
      setSaleError(`Stock insuficiente. Solo hay ${selected.stock} unidad${selected.stock === 1 ? "" : "es"} disponible${selected.stock === 1 ? "" : "s"}.`)
      return
    }

    setIsSubmitting(true)
    setSaleError(null)

    // 1. Insert venta
    const { error: ventaError } = await supabase
      .from("ventas")
      .insert([{
        cliente_id: customer.id,
        producto_id: selected.id,
        cantidad: quantity,
        total,
      }])

    if (ventaError) {
      setSaleError("No se pudo registrar la venta. Intenta de nuevo.")
      setIsSubmitting(false)
      return
    }

    // 2. Reduce stock
    const { error: stockError } = await supabase
      .from("productos")
      .update({ stock: selected.stock - quantity })
      .eq("id", selected.id)

    if (stockError) {
      setSaleError("Venta registrada pero no se pudo actualizar el stock.")
      setIsSubmitting(false)
      return
    }

    // 3. Handle payment type
    if (paymentType === "completo") {
      const { error: abonoError } = await supabase
        .from("abonos")
        .insert([{ cliente_id: customer.id, monto: total }])

      if (abonoError) {
        setSaleError("Venta registrada pero no se pudo registrar el pago en el historial.")
        setIsSubmitting(false)
        return
      }

    } else if (paymentType === "despues") {
      const { error: saldoError } = await supabase
        .from("clientes")
        .update({ saldo_pendiente: customer.balance + total })
        .eq("id", customer.id)

      if (saldoError) {
        setSaleError("Venta y stock actualizados, pero no se pudo actualizar el saldo del cliente.")
        setIsSubmitting(false)
        return
      }

    } else if (paymentType === "parcial") {
      const { error: saldoError } = await supabase
        .from("clientes")
        .update({ saldo_pendiente: customer.balance + (total - parsedPartial) })
        .eq("id", customer.id)

      if (saldoError) {
        setSaleError("Venta y stock actualizados, pero no se pudo actualizar el saldo del cliente.")
        setIsSubmitting(false)
        return
      }

      const { error: abonoError } = await supabase
        .from("abonos")
        .insert([{ cliente_id: customer.id, monto: parsedPartial }])

      if (abonoError) {
        setSaleError("Saldo actualizado pero no se pudo registrar el abono en el historial.")
        setIsSubmitting(false)
        return
      }
    }

    const balanceDelta =
      paymentType === "completo" ? 0
      : paymentType === "despues" ? total
      : total - parsedPartial

    const newBalance = customer.balance + balanceDelta

    onConfirm(customer.id, {
      total,
      productName: selected.name,
      quantity,
      balanceDelta,
    })

    setSaleResult({
      customerName: customer.name,
      productName: selected.name,
      quantity,
      total,
      paymentType,
      partialAmount: parsedPartial,
      newBalance,
      date: new Date(),
    })

    setIsSubmitting(false)
  }

  function handleWhatsApp() {
    if (!saleResult) return
    const message = buildWhatsAppMessage(saleResult)
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[92vh] max-h-[92vh] w-full max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0"
      >
        {/* Header */}
        <DialogHeader className="space-y-1 border-b border-border px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShoppingCart className="size-5 text-primary" />
            Nueva Venta a Cliente
          </DialogTitle>
          <DialogDescription>
            Para <span className="font-medium text-foreground">{customer.name}</span>
          </DialogDescription>
        </DialogHeader>

        {saleResult ? (
          /* ── Success view ── */
          <div className="flex flex-1 flex-col items-center justify-between overflow-y-auto px-5 py-6">
            {/* Icon + heading */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-green-500/15">
                <CheckCircle2 className="size-9 text-green-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">¡Venta Registrada!</h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {formatDatetime(saleResult.date)}
                </p>
              </div>
            </div>

            {/* Receipt summary */}
            <div className="mt-6 w-full rounded-2xl border border-border bg-secondary/40 p-4 font-mono text-sm">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Resumen
              </p>
              <div className="space-y-2 text-foreground">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="truncate text-right font-medium">{saleResult.customerName}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Producto</span>
                  <span className="truncate text-right font-medium">
                    {saleResult.productName} ×{saleResult.quantity}
                  </span>
                </div>
                <div className="my-2 border-t border-border" />
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Total venta</span>
                  <span className="font-semibold text-primary">{formatCurrency(saleResult.total)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Abono</span>
                  <span className="font-medium">
                    {saleResult.paymentType === "completo"
                      ? "Pagó completo"
                      : saleResult.paymentType === "despues"
                      ? "Cargado a cuenta"
                      : formatCurrency(saleResult.partialAmount)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Saldo pendiente</span>
                  <span className={cn("font-semibold", saleResult.newBalance > 0 ? "text-amber-400" : "text-green-500")}>
                    {formatCurrency(saleResult.newBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-6 flex w-full flex-col gap-3">
              <button
                type="button"
                onClick={handleWhatsApp}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-500 active:bg-green-700"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Compartir por WhatsApp
              </button>
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
          /* ── Normal sale flow ── */
          <>
            {/* Body */}
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Product search */}
              <div className="border-b border-border px-5 py-3">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Producto
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar producto del inventario..."
                    className="rounded-xl pl-9"
                    aria-label="Buscar producto"
                  />
                </div>
              </div>

              {/* Product list */}
              <div className="flex-1 overflow-y-auto px-5 py-3">
                {filtered.length > 0 ? (
                  <ul className="flex flex-col gap-2">
                    {filtered.map((product) => {
                      const isActive = product.id === selectedId
                      return (
                        <li key={product.id}>
                          <button
                            type="button"
                            onClick={() => selectProduct(product)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors",
                              isActive
                                ? "border-primary bg-primary/10"
                                : "border-border bg-secondary/40 hover:bg-secondary",
                            )}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {product.name}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {formatCurrency(product.price)} · {product.stock} en stock
                              </p>
                            </div>
                            {isActive && (
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="size-3.5" />
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
                      <Package className="size-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">Sin productos disponibles</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Summary */}
            <div className="border-t border-border bg-card px-5 py-4">
              {/* Quantity */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Cantidad</span>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={decrease}
                    disabled={!selected || quantity <= 1}
                    className="size-10 rounded-xl"
                    aria-label="Disminuir cantidad"
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center text-lg font-bold tabular-nums text-foreground">
                    {selected ? quantity : 0}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={increase}
                    disabled={!selected || quantity >= maxQty}
                    className="size-10 rounded-xl"
                    aria-label="Aumentar cantidad"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Summary panel */}
              <div className="mb-4 rounded-xl bg-secondary p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Precio unitario</span>
                  <span className="font-semibold text-foreground">
                    {selected ? formatCurrency(selected.price) : "—"}
                  </span>
                </div>
                <div className="mt-3 flex items-end justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-3xl font-bold tracking-tight text-primary">
                    {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {/* Payment options */}
              {selected && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    ¿Cómo va a pagar?
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <PaymentChip
                      active={paymentType === "completo"}
                      onClick={() => { setPaymentType("completo"); setPartialAmount("") }}
                    >
                      Pago completo
                    </PaymentChip>
                    <PaymentChip
                      active={paymentType === "despues"}
                      onClick={() => { setPaymentType("despues"); setPartialAmount("") }}
                    >
                      Pagar después
                    </PaymentChip>
                    <PaymentChip
                      active={paymentType === "parcial"}
                      onClick={() => setPaymentType("parcial")}
                    >
                      Abono parcial
                    </PaymentChip>
                  </div>

                  {paymentType === "parcial" && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        Monto del abono (menor al total)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0.01"
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        placeholder="0.00"
                        className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      {partialAmount !== "" && !isPartialValid && (
                        <p className="text-xs text-destructive">
                          {parsedPartial <= 0
                            ? "El monto debe ser mayor a 0."
                            : "El abono debe ser menor al total de la venta."}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Error message */}
              {saleError && (
                <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {saleError}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                  className="flex-1 gap-1.5 rounded-xl"
                >
                  <Check className="size-4" />
                  {isSubmitting ? "Guardando…" : "Confirmar Venta"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function PaymentChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-2 py-2.5 text-center text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
