"use client"

import { useMemo, useState } from "react"
import { Plus, Search, Users, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CustomerCard } from "@/components/customer-card"
import { CustomerProfile } from "@/components/customer-profile"
import { PaymentModal } from "@/components/payment-modal"
import { SaleModal } from "@/components/sale-modal"
import { type Customer } from "@/lib/customers"
import { formatCurrency } from "@/lib/types"
import { supabase } from "@/lib/supabase"
import { useEffect } from "react"

export function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [profileRefresh, setProfileRefresh] = useState(0)
  const [query, setQuery] = useState("")
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [saleOpen, setSaleOpen] = useState(false)
  const [customerOpen, setCustomerOpen] = useState(false)
  const [selected, setSelected] = useState<Customer | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [collected, setCollected] = useState(0)
  const [newName, setNewName] = useState("")
  const [newPhone, setNewPhone] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hasVentasForTarget, setHasVentasForTarget] = useState<boolean | null>(null)
  
useEffect(() => {
    async function fetchCustomers() {
      console.log("Iniciando extracción de Supabase...");
      const { data, error } = await supabase.from('clientes').select('*').or('activo.eq.true,activo.is.null');

      if (error) {
        console.error("Error crítico en Supabase:", error.message);
        return; 
      }

      if (data) {
        const clientesFormateados = data.map((cliente: any) => ({
          id: cliente.id,
          name: cliente.nombre,
          phone: cliente.telefono,
          balance: cliente.saldo_pendiente ?? 0
        }));

        console.log("Datos traducidos con éxito:", clientesFormateados);
        setCustomers(clientesFormateados);
      }
    }
    
    fetchCustomers();
  }, []);
      



  const filtered = useMemo(() => {
    return customers.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase().trim()),
    )
  }, [customers, query])

  const totalReceivable = useMemo(
    () => customers.reduce((sum, c) => sum + c.balance, 0),
    [customers],
  )

  function openPayment(customer: Customer) {
    setSelected(customer)
    setPaymentOpen(true)
  }

  function handleConfirmPayment(customerId: string, amount: number) {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId ? { ...c, balance: Math.max(c.balance - amount, 0) } : c,
      ),
    )
    setProfileRefresh((n) => n + 1)
    setCollected((prev) => prev + amount)
    setSelected(null)
  }

  function handleNewSale(customer: Customer) {
    setSelected(customer)
    setSaleOpen(true)
  }

  function handleConfirmSale(
    customerId: string,
    sale: { total: number; productName: string; quantity: number },
  ) {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === customerId ? { ...c, balance: c.balance + sale.total } : c,
      ),
    )
    setProfileRefresh((n) => n + 1)
    setSelected(null)
  }

  async function handleDeleteCustomer(customer: Customer) {
    setDeleteError(null)
    setHasVentasForTarget(null)

    const { count, error: countError } = await supabase
      .from("ventas")
      .select("id", { count: "exact", head: true })
      .eq("cliente_id", customer.id)

    if (countError) {
      setDeleteError("No se pudo verificar el cliente. Intenta de nuevo.")
      setDeleteTarget(customer)
      return
    }

    setHasVentasForTarget((count ?? 0) > 0)
    setDeleteTarget(customer)
  }

  async function confirmDeleteCustomer() {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)

    if (hasVentasForTarget) {
      const { error } = await supabase
        .from("clientes")
        .update({ activo: false })
        .eq("id", deleteTarget.id)

      if (error) {
        setDeleteError("No se pudo desactivar el cliente. Intenta de nuevo.")
        setIsDeleting(false)
        return
      }
    } else {
      const { error } = await supabase
        .from("clientes")
        .delete()
        .eq("id", deleteTarget.id)

      if (error) {
        setDeleteError("No se pudo eliminar el cliente. Intenta de nuevo.")
        setIsDeleting(false)
        return
      }
    }

    setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget.id))
    setDeleteTarget(null)
    setHasVentasForTarget(null)
    setIsDeleting(false)
  }

 async function handleAddCustomer(data: { name: string; phone: string }) {
    console.log("Forjando nuevo cliente en la bóveda...");

    // 1. Disparamos los datos hacia Supabase (Traduciendo al español de la DB)
    const { data: newDbCustomer, error } = await supabase
      .from('clientes')
      .insert([
        { nombre: data.name, telefono: data.phone }
      ])
      .select() // Exigimos que nos devuelva el registro recién creado
      .single(); // Como es uno solo, pedimos el objeto directo

    // 2. Control de daños si la bóveda rechaza la entrada
    if (error) {
      console.error("Falla crítica al insertar:", error.message);
      return; 
    }

    // 3. Si todo sale bien, traducimos el recibo de vuelta al idioma de React
    if (newDbCustomer) {
      const clienteReal = {
        id: newDbCustomer.id,
        name: newDbCustomer.nombre,
        phone: newDbCustomer.telefono,
        balance: 0 // El saldo inicial siempre es cero
      };

      // Inyectamos el cliente real en la pantalla y cerramos el modal
      setCustomers([clienteReal, ...customers]);
      setCustomerOpen(false);
      console.log("Cliente forjado y renderizado con éxito.");
    }
  }

  const profileCustomer = customers.find((c) => c.id === profileId) ?? null

  if (profileCustomer) {
    return (
      <>
        <CustomerProfile
          customer={profileCustomer}
          refreshKey={profileRefresh}
          onBack={() => setProfileId(null)}
          onRegisterPayment={openPayment}
          onNewSale={handleNewSale}
        />
        <PaymentModal
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onConfirm={handleConfirmPayment}
          customer={selected}
        />
        <SaleModal
          open={saleOpen}
          onOpenChange={setSaleOpen}
          onConfirm={handleConfirmSale}
          customer={selected}
        />
      </>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-5 pb-4 pt-6 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Clientes y Cobranza
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cuentas por cobrar
            </p>
          </div>
          <Button onClick={() => setCustomerOpen(true)} className="shrink-0 gap-1.5 rounded-xl">
            <Plus className="size-4" />
            Cliente
          </Button>
        </div>

        {/* Search */}
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente..."
            className="rounded-xl pl-9"
            aria-label="Buscar cliente por nombre"
          />
        </div>
      </header>

      {/* Metrics */}
      <section className="grid grid-cols-3 gap-2.5 px-5 pt-5">
        <MetricCard
          label="Clientes"
          value={String(customers.length)}
          tone="default"
        />
        <MetricCard
          label="Por Cobrar"
          value={formatCurrency(totalReceivable)}
          tone="amber"
        />
        <MetricCard
          label="Abonos Semana"
          value={formatCurrency(collected)}
          tone="accent"
        />
      </section>

      {/* Customer list */}
      <section className="flex flex-1 flex-col gap-3 px-5 py-5">
        {filtered.length > 0 ? (
          filtered.map((customer) => (
            <CustomerCard
              key={customer.id}
              customer={customer}
              onRegisterPayment={openPayment}
              onNewSale={handleNewSale}
              onOpenProfile={(c) => setProfileId(c.id)}
              onDelete={handleDeleteCustomer}
            />
          ))
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary">
              <UserX className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No se encontraron clientes</p>
          </div>
        )}
      </section>

      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onConfirm={handleConfirmPayment}
        customer={selected}
      />
      <SaleModal
        open={saleOpen}
        onOpenChange={setSaleOpen}
        onConfirm={handleConfirmSale}
        customer={selected}
      />

      {/* Modal: Confirmar eliminación de cliente */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-customer-title"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card px-6 py-6 shadow-xl">
            <h2
              id="delete-customer-title"
              className="mb-1 text-xl font-bold tracking-tight text-foreground"
            >
              {hasVentasForTarget ? "Desactivar cliente" : "Eliminar cliente"}
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              {hasVentasForTarget ? (
                <>
                  <span className="font-medium text-foreground">{deleteTarget.name}</span>{" "}
                  tiene ventas registradas. ¿Deseas desactivarlo? Seguirá en el historial pero no aparecerá en la lista activa.
                </>
              ) : (
                <>
                  ¿Eliminar a{" "}
                  <span className="font-medium text-foreground">{deleteTarget.name}</span>? Esta acción no se puede deshacer.
                </>
              )}
            </p>

            {deleteError && (
              <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {deleteError}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setDeleteError(null); setHasVentasForTarget(null) }}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-border bg-secondary py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteCustomer}
                disabled={isDeleting}
                className={`flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${hasVentasForTarget ? "bg-amber-500 hover:bg-amber-500/90" : "bg-destructive hover:bg-destructive/90"}`}
              >
                {isDeleting
                  ? hasVentasForTarget ? "Desactivando…" : "Eliminando…"
                  : hasVentasForTarget ? "Sí, desactivar" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {customerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-customer-title"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card px-6 py-6 shadow-xl">
            <h2
              id="new-customer-title"
              className="mb-1 text-xl font-bold tracking-tight text-foreground"
            >
              Agregar Cliente
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Registra un nuevo cliente para tu cartera.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!newName.trim()) return
                await handleAddCustomer({ name: newName.trim(), phone: newPhone.trim() })
                setNewName("")
                setNewPhone("")
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="inline-name" className="text-sm font-medium text-foreground">
                  Nombre completo
                </label>
                <input
                  id="inline-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. María Fernanda López"
                  autoFocus
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="inline-phone" className="text-sm font-medium text-foreground">
                  Teléfono
                </label>
                <input
                  id="inline-phone"
                  type="tel"
                  inputMode="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="55 1234 5678"
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="mt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCustomerOpen(false)
                    setNewName("")
                    setNewPhone("")
                  }}
                  className="flex-1 rounded-xl border border-border bg-secondary py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
    
  )
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: "default" | "amber" | "accent"
}) {
  const valueColor =
    tone === "amber"
      ? "text-amber-400"
      : tone === "accent"
        ? "text-accent"
        : "text-foreground"

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-1.5">
        {tone === "default" && <Users className="size-3.5 text-muted-foreground" aria-hidden="true" />}
        <span className="text-xs leading-tight text-muted-foreground">{label}</span>
      </div>
      <span className={`text-base font-bold leading-tight tracking-tight ${valueColor}`}>
        {value}
      </span>
    </div>
  )
}
