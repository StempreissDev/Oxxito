"use client"

import { useEffect, useMemo, useState } from "react"
import { Search, Minus, Plus, ShoppingCart, Check, Package } from "lucide-react"
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

type SaleModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (
    customerId: string,
    sale: { total: number; productName: string; quantity: number },
  ) => void
  customer?: Customer | null
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
  const [saleError, setSaleError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setQuery("")
    setSelectedId(null)
    setQuantity(1)
    setSaleError(null)
    setIsSubmitting(false)

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

  if (!customer) return null

  function selectProduct(product: Product) {
    setSelectedId(product.id)
    setQuantity(1)
  }

  function decrease() {
    setQuantity((q) => Math.max(1, q - 1))
  }

  function increase() {
    setQuantity((q) => Math.min(maxQty, q + 1))
  }

  async function handleConfirm() {
    if (!selected || !customer) return

    if (quantity > selected.stock) {
      setSaleError(`Stock insuficiente. Solo hay ${selected.stock} unidad${selected.stock === 1 ? "" : "es"} disponible${selected.stock === 1 ? "" : "s"}.`)
      return
    }

    setIsSubmitting(true)
    setSaleError(null)

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

    const { error: stockError } = await supabase
      .from("productos")
      .update({ stock: selected.stock - quantity })
      .eq("id", selected.id)

    if (stockError) {
      setSaleError("Venta registrada pero no se pudo actualizar el stock.")
      setIsSubmitting(false)
      return
    }

    onConfirm(customer.id, {
      total,
      productName: selected.name,
      quantity,
    })
    onOpenChange(false)
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
              <span className="text-sm text-muted-foreground">Total a agregar</span>
              <span className="text-3xl font-bold tracking-tight text-primary">
                {formatCurrency(total)}
              </span>
            </div>
          </div>

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
              disabled={!selected || isSubmitting}
              className="flex-1 gap-1.5 rounded-xl"
            >
              <Check className="size-4" />
              {isSubmitting ? "Guardando…" : "Confirmar Venta"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
