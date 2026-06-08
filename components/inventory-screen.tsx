"use client"

import { useMemo, useState } from "react"
import { Plus, Search, PackageOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProductCard } from "@/components/product-card"
import { ProductModal } from "@/components/product-modal"
import { initialProducts, type Product } from "@/lib/types"
import { cn } from "@/lib/utils"

type StockFilter = "all" | "low"

export function InventoryScreen() {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<StockFilter>("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase().trim())
      const matchesFilter = filter === "all" ? true : p.stock <= 5
      return matchesQuery && matchesFilter
    })
  }, [products, query, filter])

  function handleSave(data: { name: string; price: number; stock: number }) {
    if (editing) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editing.id ? { ...p, ...data } : p)),
      )
    } else {
      setProducts((prev) => [{ id: crypto.randomUUID(), ...data }, ...prev])
    }
    setEditing(null)
  }

  function openNew() {
    setEditing(null)
    setModalOpen(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setModalOpen(true)
  }

  function handleDelete(id: string) {
    setProducts((prev) => prev.filter((p) => p.id !== id))
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 px-5 pb-4 pt-6 backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Inventario de Productos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {products.length} artículos registrados
            </p>
          </div>
          <Button onClick={openNew} className="shrink-0 gap-1.5 rounded-xl">
            <Plus className="size-4" />
            Nuevo
          </Button>
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar producto..."
              className="rounded-xl pl-9"
              aria-label="Buscar producto por nombre"
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            Todos
          </FilterChip>
          <FilterChip active={filter === "low"} onClick={() => setFilter("low")}>
            Bajo stock
          </FilterChip>
        </div>
      </header>

      {/* Product list */}
      <section className="flex flex-1 flex-col gap-3 px-5 py-5">
        {filtered.length > 0 ? (
          filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary">
              <PackageOpen className="size-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No se encontraron productos
            </p>
          </div>
        )}
      </section>

      <ProductModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSave}
        product={editing}
      />
    </main>
  )
}

function FilterChip({
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
        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  )
}
