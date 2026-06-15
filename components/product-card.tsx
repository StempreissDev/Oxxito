"use client"

import { MoreVertical, Pencil, Trash2, AlertTriangle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type Product, formatCurrency } from "@/lib/types"
import { cn } from "@/lib/utils"

type ProductCardProps = {
  product: Product
  onEdit: (product: Product) => void
  onDelete: (id: string) => void
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const isOut = product.stock === 0
  const isLow = product.stock > 0 && product.stockMin > 0 && product.stock <= product.stockMin

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-semibold leading-tight text-card-foreground">
          {product.name}
        </h3>

        <div className="mt-2 flex items-center gap-3">
          <span className="text-lg font-bold tracking-tight text-accent">
            {formatCurrency(product.price)}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              isOut
                ? "bg-destructive/15 text-destructive"
                : isLow
                  ? "bg-amber-500/15 text-amber-400"
                  : "bg-secondary text-muted-foreground",
            )}
          >
            {(isOut || isLow) && <AlertTriangle className="size-3" aria-hidden="true" />}
            {isOut ? "Sin stock" : `${product.stock} en stock`}
          </span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Acciones para ${product.name}`}
        >
          <MoreVertical className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onEdit(product)}>
            <Pencil className="size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(product.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="size-4" />
            Eliminar producto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
