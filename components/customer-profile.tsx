"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowLeft,
  Phone,
  HandCoins,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  PackageOpen,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { type Customer } from "@/lib/customers"
import { formatCurrency } from "@/lib/types"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type Movement = {
  id: string
  type: "compra" | "abono"
  date: string
  amount: number
  productName?: string
  quantity?: number
}

type CustomerProfileProps = {
  customer: Customer
  refreshKey?: number
  onBack: () => void
  onRegisterPayment: (customer: Customer) => void
  onNewSale: (customer: Customer) => void
}

type Filter = "todo" | "compras" | "abonos"

const TABS: { key: Filter; label: string }[] = [
  { key: "todo", label: "Todo" },
  { key: "compras", label: "Compras" },
  { key: "abonos", label: "Abonos" },
]

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, "0")
  const mins = String(d.getMinutes()).padStart(2, "0")
  return `${day}/${month}/${year} ${hours}:${mins}`
}

export function CustomerProfile({
  customer,
  refreshKey,
  onBack,
  onRegisterPayment,
  onNewSale,
}: CustomerProfileProps) {
  const [movements, setMovements] = useState<Movement[]>([])
  const [filter, setFilter] = useState<Filter>("todo")
  const hasDebt = customer.balance > 0

  useEffect(() => {
    async function fetchMovements() {
      const [ventasResult, abonosResult] = await Promise.all([
        supabase
          .from("ventas")
          .select("id, total, cantidad, fecha_venta, productos(nombre)")
          .eq("cliente_id", customer.id),
        supabase
          .from("abonos")
          .select("id, monto, fecha_abono")
          .eq("cliente_id", customer.id),
      ])

      const compras: Movement[] = (ventasResult.data ?? []).map((v: any) => ({
        id: v.id,
        type: "compra" as const,
        date: v.fecha_venta,
        amount: Number(v.total),
        productName: v.productos?.nombre,
        quantity: v.cantidad,
      }))

      const abonos: Movement[] = (abonosResult.data ?? []).map((a: any) => ({
        id: a.id,
        type: "abono" as const,
        date: a.fecha_abono,
        amount: Number(a.monto),
      }))

      setMovements(
        [...compras, ...abonos].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      )
    }

    fetchMovements()
  }, [customer.id, refreshKey])

  const filtered = useMemo(() => {
    if (filter === "compras") return movements.filter((m) => m.type === "compra")
    if (filter === "abonos") return movements.filter((m) => m.type === "abono")
    return movements
  }, [movements, filter])

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-5 pb-4 pt-6 backdrop-blur-md">
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 mb-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Volver
        </button>
        <div className="flex items-start gap-3">
          <div
            className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-base font-semibold text-foreground"
            aria-hidden="true"
          >
            {customer.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold leading-tight tracking-tight text-foreground">
              {customer.name}
            </h1>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Phone className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{customer.phone}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-5 py-5">
        {/* Debt hero card */}
        <section
          className={cn(
            "rounded-2xl border p-5",
            hasDebt
              ? "border-amber-500/30 bg-amber-500/5"
              : "border-accent/30 bg-accent/5",
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              Deuda Total Actual
            </span>
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
          <p
            className={cn(
              "mt-3 text-4xl font-bold tracking-tight",
              hasDebt ? "text-foreground" : "text-accent",
            )}
          >
            {formatCurrency(customer.balance)}
          </p>

          <div className="mt-5 flex items-center gap-2.5">
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
        </section>

        {/* Movements */}
        <section className="flex flex-1 flex-col">
          <h2 className="mb-3 text-base font-semibold tracking-tight text-foreground">
            Historial de Movimientos
          </h2>

          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Filtrar movimientos"
            className="mb-4 flex gap-1 rounded-xl bg-secondary p-1"
          >
            {TABS.map((tab) => {
              const active = filter === tab.key
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setFilter(tab.key)}
                  className={cn(
                    "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Timeline */}
          {filtered.length > 0 ? (
            <ol className="relative flex flex-col">
              {filtered.map((m, i) => (
                <TimelineItem key={m.id} movement={m} last={i === filtered.length - 1} />
              ))}
            </ol>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
                <PackageOpen className="size-6 text-muted-foreground" aria-hidden="true" />
              </div>
              <p className="text-sm text-muted-foreground">
                Sin movimientos en esta categoría
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function TimelineItem({ movement, last }: { movement: Movement; last: boolean }) {
  const isPayment = movement.type === "abono"

  return (
    <li className="relative flex gap-3.5 pb-4">
      {/* Connector line */}
      {!last && (
        <span
          className="absolute left-[15px] top-9 h-[calc(100%-1.5rem)] w-px bg-border"
          aria-hidden="true"
        />
      )}

      {/* Icon node */}
      <span
        className={cn(
          "z-[1] flex size-8 shrink-0 items-center justify-center rounded-full",
          isPayment
            ? "bg-accent/15 text-accent"
            : "bg-amber-500/15 text-amber-400",
        )}
        aria-hidden="true"
      >
        {isPayment ? (
          <HandCoins className="size-4" />
        ) : (
          <ShoppingCart className="size-4" />
        )}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {isPayment ? "Abono recibido" : (movement.productName ?? "Producto")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatDateTime(movement.date)}
              {!isPayment && movement.quantity ? ` · ${movement.quantity} u` : ""}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 text-sm font-bold tabular-nums",
              isPayment ? "text-accent" : "text-foreground",
            )}
          >
            {formatCurrency(movement.amount)}
          </span>
        </div>
        <span
          className={cn(
            "mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
            isPayment
              ? "bg-accent/15 text-accent"
              : "bg-amber-500/15 text-amber-400",
          )}
        >
          {isPayment ? "Abono" : "Cargo a cuenta"}
        </span>
      </div>
    </li>
  )
}
