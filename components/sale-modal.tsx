"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Minus, Plus, ShoppingCart, Check, Package, CheckCircle2, X } from "lucide-react"
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

type CartItem = {
  product: Product
  quantity: number
}

type SaleResultItem = {
  productName: string
  quantity: number
  subtotal: number
}

type SaleResult = {
  customerName: string
  items: SaleResultItem[]
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
    sale: { total: number; balanceDelta: number },
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

  const itemLines = result.items
    .map((item) => `  - ${item.productName} x${item.quantity}: ${formatCurrency(item.subtotal)}`)
    .join("\n")

  return [
    `• *Oxxito - Venta Registrada*`,
    `─────────────────`,
    `• Cliente: ${result.customerName}`,
    `• Productos:\n${itemLines}`,
    `─────────────────`,
    `• Total venta: ${formatCurrency(result.total)}`,
    `• Abono: ${abonoLine}`,
    `• Saldo pendiente: ${formatCurrency(result.newBalance)}`,
    `─────────────────`,
    `• ${formatDatetime(result.date)}`,
    `Gracias por su compra`,
  ].join("\n")
}

export function SaleModal({ open, onOpenChange, onConfirm, customer }: SaleModalProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentType, setPaymentType] = useState<PaymentType>(null)
  const [partialAmount, setPartialAmount] = useState("")
  const [saleError, setSaleError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null)

  useEffect(() => {
    if (!open) return
    setQuery("")
    setCart([])
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
            stockMin: p.stock_minimo ?? 5,
          }))
        )
      }
    }

    fetchProducts()
  }, [open])

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    return products.filter((p) => p.stock > 0 && p.name.toLowerCase().includes(q))
  }, [products, query])

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  )

  const parsedPartial = parseFloat(partialAmount) || 0
  const isPartialValid = parsedPartial > 0 && parsedPartial < total

  const canConfirm =
    cart.length > 0 &&
    !!paymentType &&
    !isSubmitting &&
    (paymentType !== "parcial" || isPartialValid)

  if (!customer) return null

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product, quantity: 1 }]
    })
    setSaleError(null)
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  async function handleConfirm() {
    if (!customer || cart.length === 0 || !paymentType) return

    for (const item of cart) {
      if (item.quantity > item.product.stock) {
        setSaleError(`Stock insuficiente para "${item.product.name}". Solo hay ${item.product.stock} disponible${item.product.stock === 1 ? "" : "s"}.`)
        return
      }
    }

    setIsSubmitting(true)
    setSaleError(null)

    // 1. Insert venta
    const { data: ventaData, error: ventaError } = await supabase
      .from("ventas")
      .insert([{ cliente_id: customer.id, total }])
      .select("id")
      .single()

    if (ventaError || !ventaData) {
      setSaleError("No se pudo registrar la venta. Intenta de nuevo.")
      setIsSubmitting(false)
      return
    }

    // 2. Insert detalle_ventas
    const { error: detalleError } = await supabase
      .from("detalle_ventas")
      .insert(
        cart.map((item) => ({
          venta_id: ventaData.id,
          producto_id: item.product.id,
          cantidad: item.quantity,
          subtotal: item.product.price * item.quantity,
        }))
      )

    if (detalleError) {
      setSaleError("Venta registrada pero no se pudieron guardar los detalles.")
      setIsSubmitting(false)
      return
    }

    // 3. Update stock for each product
    for (const item of cart) {
      const { error: stockError } = await supabase
        .from("productos")
        .update({ stock: item.product.stock - item.quantity })
        .eq("id", item.product.id)

      if (stockError) {
        setSaleError(`Venta registrada pero no se pudo actualizar el stock de "${item.product.name}".`)
        setIsSubmitting(false)
        return
      }
    }

    // 4. Handle payment type
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
        setSaleError("Venta registrada pero no se pudo actualizar el saldo del cliente.")
        setIsSubmitting(false)
        return
      }
    } else if (paymentType === "parcial") {
      const { error: saldoError } = await supabase
        .from("clientes")
        .update({ saldo_pendiente: customer.balance + (total - parsedPartial) })
        .eq("id", customer.id)

      if (saldoError) {
        setSaleError("Venta registrada pero no se pudo actualizar el saldo del cliente.")
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

    onConfirm(customer.id, { total, balanceDelta })

    setSaleResult({
      customerName: customer.name,
      items: cart.map((item) => ({
        productName: item.product.name,
        quantity: item.quantity,
        subtotal: item.product.price * item.quantity,
      })),
      total,
      paymentType,
      partialAmount: parsedPartial,
      newBalance,
      date: new Date(),
    })

    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[92vh] max-h-[92vh] w-full max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-border bg-card p-0"
      >
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

            <div className="mt-6 w-full rounded-2xl border border-border bg-secondary/40 p-4 font-mono text-sm">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Resumen
              </p>
              <div className="space-y-2 text-foreground">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="truncate text-right font-medium">{saleResult.customerName}</span>
                </div>
                <div className="my-1 border-t border-border" />
                {saleResult.items.map((item) => (
                  <div key={item.productName} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate text-muted-foreground">
                      {item.productName} ×{item.quantity}
                    </span>
                    <span className="shrink-0 font-medium">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
                <div className="my-1 border-t border-border" />
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

            <div className="mt-6 flex w-full flex-col gap-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(saleResult))}`}
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
          /* ── Normal sale flow ── */
          <>
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Product search */}
              <div className="border-b border-border px-5 py-3">
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Agregar productos
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

              {/* Scrollable body: product list + cart */}
              <div className="flex-1 overflow-y-auto">
                {/* Product list */}
                <div className="px-5 py-3">
                  {filtered.length > 0 ? (
                    <ul className="flex flex-col gap-2">
                      {filtered.map((product) => {
                        const cartItem = cart.find((i) => i.product.id === product.id)
                        return (
                          <li key={product.id}>
                            <button
                              type="button"
                              onClick={() => addToCart(product)}
                              className={cn(
                                "flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors",
                                cartItem
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
                              {cartItem ? (
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                                  {cartItem.quantity}
                                </span>
                              ) : (
                                <Plus className="size-4 shrink-0 text-muted-foreground" />
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                      <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
                        <Package className="size-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">Sin productos disponibles</p>
                    </div>
                  )}
                </div>

                {/* Cart */}
                {cart.length > 0 && (
                  <div className="border-t border-border px-5 py-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Carrito ({cart.length})
                    </p>
                    <ul className="flex flex-col gap-2">
                      {cart.map((item) => (
                        <li
                          key={item.product.id}
                          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {item.product.name}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatCurrency(item.product.price)} c/u · {formatCurrency(item.product.price * item.quantity)}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateQty(item.product.id, -1)}
                              className="flex size-7 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors hover:bg-secondary/80"
                              aria-label="Quitar uno"
                            >
                              <Minus className="size-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold tabular-nums text-foreground">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQty(item.product.id, 1)}
                              disabled={item.quantity >= item.product.stock}
                              className="flex size-7 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors hover:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-40"
                              aria-label="Agregar uno"
                            >
                              <Plus className="size-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Quitar ${item.product.name}`}
                          >
                            <X className="size-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border bg-card px-5 py-4">
              <div className="mb-4 flex items-center justify-between rounded-xl bg-secondary p-3">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-2xl font-bold tracking-tight text-primary">
                  {formatCurrency(total)}
                </span>
              </div>

              {cart.length > 0 && (
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

              {saleError && (
                <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {saleError}
                </p>
              )}

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
