"use client"

import { useMemo, useState } from "react"
import { Plus, Search, Users, UserX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CustomerCard } from "@/components/customer-card"
import { CustomerProfile } from "@/components/customer-profile"
import { PaymentModal } from "@/components/payment-modal"
import { SaleModal } from "@/components/sale-modal"
import { CustomerModal } from "@/components/customer-modal"
import { initialMovements, weeklyPayments, type Customer, type Movement } from "@/lib/customers"
import { formatCurrency } from "@/lib/types"
import { supabase } from "@/lib/supabase"
import { useEffect } from "react"

export function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [movements, setMovements] = useState<Movement[]>(initialMovements)
  const [query, setQuery] = useState("")
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [saleOpen, setSaleOpen] = useState(false)
  const [customerOpen, setCustomerOpen] = useState(false)
  const [selected, setSelected] = useState<Customer | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [collected, setCollected] = useState(0)
  
useEffect(() => {
    async function fetchCustomers() {
      console.log("Iniciando extracción de Supabase...");
      const { data, error } = await supabase.from('clientes').select('*');

      if (error) {
        console.error("Error crítico en Supabase:", error.message);
        return; 
      }

      if (data) {
        const clientesFormateados = data.map((cliente: any) => ({
          id: cliente.id,
          name: cliente.nombre,
          phone: cliente.telefono,
          balance: 0
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
    setMovements((prev) => [
      {
        id: crypto.randomUUID(),
        customerId,
        type: "abono",
        date: new Date().toISOString(),
        amount,
      },
      ...prev,
    ])
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
    setMovements((prev) => [
      {
        id: crypto.randomUUID(),
        customerId,
        type: "compra",
        date: new Date().toISOString(),
        amount: sale.total,
        productName: sale.productName,
        quantity: sale.quantity,
      },
      ...prev,
    ])
    setSelected(null)
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
          movements={movements.filter((m) => m.customerId === profileCustomer.id)}
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
      <CustomerModal
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        onSave={handleAddCustomer}
      />
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
