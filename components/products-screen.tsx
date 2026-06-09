"use client"

import { useMemo, useState, useEffect } from "react"
import { Plus, Search, PackageOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProductCard } from "@/components/product-card"
import { type Product } from "@/lib/types"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type StockFilter = "all" | "low"

export function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState<StockFilter>("all")
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [fieldName, setFieldName] = useState("")
  const [fieldPrice, setFieldPrice] = useState("")
  const [fieldStock, setFieldStock] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase.from("productos").select("*")

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
  }, [])

  function openNew() {
    setEditing(null)
    setFieldName("")
    setFieldPrice("")
    setFieldStock("")
    setModalOpen(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setFieldName(product.name)
    setFieldPrice(String(product.price))
    setFieldStock(String(product.stock))
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    setFieldName("")
    setFieldPrice("")
    setFieldStock("")
  }

  async function handleAddProduct() {
    const { data: newDbProduct, error } = await supabase
      .from("productos")
      .insert([{
        nombre: fieldName.trim(),
        precio: parseFloat(fieldPrice) || 0,
        stock: parseInt(fieldStock, 10) || 0,
      }])
      .select()
      .single()

    if (error) {
      console.error("Error al insertar producto:", error.message)
      return
    }

    if (newDbProduct) {
      const productoReal: Product = {
        id: newDbProduct.id,
        name: newDbProduct.nombre,
        price: Number(newDbProduct.precio),
        stock: newDbProduct.stock,
      }
      setProducts((prev) => [productoReal, ...prev])
      closeModal()
    }
  }

  function handleEditProduct() {
    if (!editing) return
    setProducts((prev) =>
      prev.map((p) =>
        p.id === editing.id
          ? {
              ...p,
              name: fieldName.trim(),
              price: parseFloat(fieldPrice) || 0,
              stock: parseInt(fieldStock, 10) || 0,
            }
          : p
      )
    )
    closeModal()
  }

  function handleDelete(id: string) {
    const product = products.find((p) => p.id === id) ?? null
    setDeleteTarget(product)
    setDeleteError(null)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    setDeleteError(null)

    const { count, error: countError } = await supabase
      .from("ventas")
      .select("id", { count: "exact", head: true })
      .eq("producto_id", deleteTarget.id)

    if (countError) {
      setDeleteError("No se pudo verificar el producto. Intenta de nuevo.")
      setIsDeleting(false)
      return
    }

    if (count && count > 0) {
      setDeleteError("Este producto tiene ventas registradas y no puede eliminarse.")
      setIsDeleting(false)
      return
    }

    const { error } = await supabase
      .from("productos")
      .delete()
      .eq("id", deleteTarget.id)

    if (error) {
      setDeleteError("No se pudo eliminar el producto. Intenta de nuevo.")
      setIsDeleting(false)
      return
    }

    setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id))
    setDeleteTarget(null)
    setIsDeleting(false)
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase().trim())
      const matchesFilter = filter === "all" ? true : p.stock <= 5
      return matchesQuery && matchesFilter
    })
  }, [products, query, filter])

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

      {/* Modal: Confirmar eliminación */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card px-6 py-6 shadow-xl">
            <h2
              id="delete-modal-title"
              className="mb-1 text-xl font-bold tracking-tight text-foreground"
            >
              Eliminar producto
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              ¿Estás seguro de eliminar{" "}
              <span className="font-medium text-foreground">{deleteTarget.name}</span>? Esta acción no se puede deshacer.
            </p>

            {deleteError && (
              <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {deleteError}
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { setDeleteTarget(null); setDeleteError(null) }}
                disabled={isDeleting}
                className="flex-1 rounded-xl border border-border bg-secondary py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-medium text-white transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo / Editar Producto */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card px-6 py-6 shadow-xl">
            <h2
              id="product-modal-title"
              className="mb-1 text-xl font-bold tracking-tight text-foreground"
            >
              {editing ? "Editar Producto" : "Nuevo Producto"}
            </h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Completa los datos del artículo para tu inventario.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!fieldName.trim()) return
                if (editing) {
                  handleEditProduct()
                } else {
                  await handleAddProduct()
                }
              }}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label htmlFor="p-name" className="text-sm font-medium text-foreground">
                  Nombre del producto
                </label>
                <input
                  id="p-name"
                  type="text"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="Ej. Café de Especialidad 500g"
                  autoFocus
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="p-price" className="text-sm font-medium text-foreground">
                    Precio de venta
                  </label>
                  <input
                    id="p-price"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={fieldPrice}
                    onChange={(e) => setFieldPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="p-stock" className="text-sm font-medium text-foreground">
                    Stock
                  </label>
                  <input
                    id="p-stock"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={fieldStock}
                    onChange={(e) => setFieldStock(e.target.value)}
                    placeholder="0"
                    className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              <div className="mt-1 flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 rounded-xl border border-border bg-secondary py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!fieldName.trim()}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editing ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
