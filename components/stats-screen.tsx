"use client"

import { useCallback, useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import { TrendingUp, Banknote, Clock, ShoppingBag, CheckCircle2, AlertCircle, Package } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { formatCurrency } from "@/lib/types"
import { cn } from "@/lib/utils"

type Period = "today" | "week" | "month"

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
]

type ChartDatum = { label: string; total: number }

type TopProduct = {
  nombre: string
  cantidad: number
  total: number
}

type DebtorClient = {
  id: string
  nombre: string
  saldoPendiente: number
  lastMovement: string | null
}

type Stats = {
  totalVendido: number
  totalCobrado: number
  porCobrar: number
  ventasCount: number
  chartData: ChartDatum[]
  topProducts: TopProduct[]
}

function getPeriodStart(period: Period): Date {
  const now = new Date()
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  }
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  d.setDate(d.getDate() - (period === "week" ? 6 : 29))
  return d
}

function buildChartData(ventasData: any[], start: Date): ChartDatum[] {
  const grouped: Record<string, number> = {}
  ventasData.forEach((v) => {
    const d = new Date(v.fecha_venta)
    const key = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
    grouped[key] = (grouped[key] || 0) + Number(v.total)
  })
  const result: ChartDatum[] = []
  const cursor = new Date(start)
  const now = new Date()
  while (cursor <= now) {
    const key = `${String(cursor.getDate()).padStart(2, "0")}/${String(cursor.getMonth() + 1).padStart(2, "0")}`
    result.push({ label: key, total: grouped[key] || 0 })
    cursor.setDate(cursor.getDate() + 1)
  }
  return result
}

function buildTopProducts(ventasData: any[]): TopProduct[] {
  const map: Record<string, TopProduct> = {}
  ventasData.forEach((v) => {
    const id = v.producto_id
    if (!id) return
    if (!map[id]) {
      map[id] = { nombre: v.productos?.nombre ?? "Producto", cantidad: 0, total: 0 }
    }
    map[id].cantidad += Number(v.cantidad ?? 1)
    map[id].total += Number(v.total ?? 0)
  })
  return Object.values(map)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 3)
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "Sin movimientos"
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-foreground">{label}</p>
      <p className="mt-0.5 text-[#60a5fa]">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

export function StatsScreen() {
  const [period, setPeriod] = useState<Period>("week")
  const [stats, setStats] = useState<Stats>({
    totalVendido: 0,
    totalCobrado: 0,
    porCobrar: 0,
    ventasCount: 0,
    chartData: [],
    topProducts: [],
  })
  const [loading, setLoading] = useState(true)
  const [debtors, setDebtors] = useState<DebtorClient[]>([])
  const [loadingDebtors, setLoadingDebtors] = useState(true)

  const fetchStats = useCallback(async (p: Period) => {
    setLoading(true)
    const start = getPeriodStart(p)
    const startISO = start.toISOString()

    const [ventasResult, abonosResult, clientesResult] = await Promise.all([
      supabase
        .from("ventas")
        .select("total, fecha_venta, producto_id, cantidad, productos(nombre)")
        .gte("fecha_venta", startISO),
      supabase
        .from("abonos")
        .select("monto")
        .gte("fecha_abono", startISO),
      supabase
        .from("clientes")
        .select("saldo_pendiente")
        .or("activo.eq.true,activo.is.null"),
    ])

    const ventasData = ventasResult.data ?? []
    const abonosData = abonosResult.data ?? []
    const clientesData = clientesResult.data ?? []

    setStats({
      totalVendido: ventasData.reduce((sum, v) => sum + Number(v.total), 0),
      totalCobrado: abonosData.reduce((sum, a) => sum + Number(a.monto), 0),
      porCobrar: clientesData.reduce((sum, c) => sum + Number(c.saldo_pendiente ?? 0), 0),
      ventasCount: ventasData.length,
      chartData: buildChartData(ventasData, start),
      topProducts: buildTopProducts(ventasData),
    })
    setLoading(false)
  }, [])

  const fetchDebtors = useCallback(async () => {
    setLoadingDebtors(true)

    const { data: debtorsData } = await supabase
      .from("clientes")
      .select("id, nombre, saldo_pendiente")
      .or("activo.eq.true,activo.is.null")
      .gt("saldo_pendiente", 0)
      .order("saldo_pendiente", { ascending: false })

    if (!debtorsData || debtorsData.length === 0) {
      setDebtors([])
      setLoadingDebtors(false)
      return
    }

    const ids = debtorsData.map((d) => d.id)
    const [lastVentasResult, lastAbonosResult] = await Promise.all([
      supabase.from("ventas").select("cliente_id, fecha_venta").in("cliente_id", ids),
      supabase.from("abonos").select("cliente_id, fecha_abono").in("cliente_id", ids),
    ])

    const lastMovementMap: Record<string, string> = {}
    lastVentasResult.data?.forEach((v) => {
      const prev = lastMovementMap[v.cliente_id]
      if (!prev || v.fecha_venta > prev) lastMovementMap[v.cliente_id] = v.fecha_venta
    })
    lastAbonosResult.data?.forEach((a) => {
      const prev = lastMovementMap[a.cliente_id]
      if (!prev || a.fecha_abono > prev) lastMovementMap[a.cliente_id] = a.fecha_abono
    })

    setDebtors(
      debtorsData.map((d) => ({
        id: d.id,
        nombre: d.nombre,
        saldoPendiente: Number(d.saldo_pendiente ?? 0),
        lastMovement: lastMovementMap[d.id] ?? null,
      })),
    )
    setLoadingDebtors(false)
  }, [])

  useEffect(() => {
    fetchStats(period)
  }, [period, fetchStats])

  useEffect(() => {
    fetchDebtors()
  }, [fetchDebtors])

  const maxCantidad = stats.topProducts[0]?.cantidad ?? 1

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-5 pb-4 pt-6 backdrop-blur-md">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Estadísticas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Resumen de tu negocio</p>
        <div className="mt-4 flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                period === p.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-5 px-5 py-5">
        {/* Summary cards */}
        <section className="grid grid-cols-2 gap-3">
          <StatCard label="Total Vendido" value={formatCurrency(stats.totalVendido)} icon={TrendingUp} tone="primary" loading={loading} />
          <StatCard label="Total Cobrado" value={formatCurrency(stats.totalCobrado)} icon={Banknote} tone="accent" loading={loading} />
          <StatCard label="Por Cobrar" value={formatCurrency(stats.porCobrar)} icon={Clock} tone="amber" loading={loading} />
          <StatCard label="Ventas Realizadas" value={String(stats.ventasCount)} icon={ShoppingBag} tone="default" loading={loading} />
        </section>

        {/* Bar chart */}
        <section>
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">Ventas por día</h2>
          <div className="rounded-2xl border border-border bg-card p-4">
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-muted-foreground">Cargando…</p>
              </div>
            ) : stats.chartData.every((d) => d.total === 0) ? (
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-muted-foreground">Sin ventas en este período</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#374151" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    interval={stats.chartData.length > 14 ? Math.floor(stats.chartData.length / 7) : 0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "#1f2937" }} />
                  <Bar dataKey="total" fill="#60a5fa" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Section 4 — Clientes con deuda */}
        <section>
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">
            Clientes con deuda pendiente
          </h2>
          {loadingDebtors ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-secondary" />
              ))}
            </div>
          ) : debtors.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-accent/15">
                <CheckCircle2 className="size-6 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">¡Todo al corriente!</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Sin deudas pendientes</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {debtors.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{client.nombre}</p>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <AlertCircle className="size-3 shrink-0 text-amber-400" />
                      <p className="text-xs text-muted-foreground">
                        Últ. mov.: {formatDateShort(client.lastMovement)}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-amber-400">
                    {formatCurrency(client.saldoPendiente)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 5 — Top productos */}
        <section>
          <h2 className="mb-4 text-base font-semibold tracking-tight text-foreground">
            Top productos más vendidos
          </h2>
          {loading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-secondary" />
              ))}
            </div>
          ) : stats.topProducts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary">
                <Package className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Sin ventas en este período</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.topProducts.map((product, i) => (
                <div
                  key={product.nombre}
                  className="rounded-2xl border border-border bg-card px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          i === 0
                            ? "bg-amber-500/20 text-amber-400"
                            : i === 1
                              ? "bg-secondary text-muted-foreground"
                              : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {product.nombre}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {product.cantidad} unidad{product.cantidad === 1 ? "" : "es"}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                      {formatCurrency(product.total)}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        i === 0 ? "bg-[#60a5fa]" : "bg-secondary-foreground/30",
                      )}
                      style={{ width: `${Math.round((product.cantidad / maxCantidad) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

type Tone = "primary" | "accent" | "amber" | "default"

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
  loading,
}: {
  label: string
  value: string
  icon: React.ElementType
  tone: Tone
  loading: boolean
}) {
  const iconColor =
    tone === "primary" ? "text-primary"
    : tone === "accent" ? "text-accent"
    : tone === "amber" ? "text-amber-400"
    : "text-muted-foreground"

  const valueColor =
    tone === "primary" ? "text-primary"
    : tone === "accent" ? "text-accent"
    : tone === "amber" ? "text-amber-400"
    : "text-foreground"

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("size-3.5 shrink-0", iconColor)} aria-hidden="true" />
        <span className="text-xs leading-tight text-muted-foreground">{label}</span>
      </div>
      {loading ? (
        <div className="h-6 w-20 animate-pulse rounded-md bg-secondary" />
      ) : (
        <span className={cn("text-lg font-bold leading-tight tracking-tight", valueColor)}>
          {value}
        </span>
      )}
    </div>
  )
}
