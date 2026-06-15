export type Product = {
  id: string
  name: string
  price: number
  stock: number
  stockMin: number
}

export const initialProducts: Product[] = [
  { id: "1", name: "Café de Especialidad 500g", price: 189.0, stock: 24, stockMin: 5 },
  { id: "2", name: "Termo de Acero Inoxidable", price: 349.5, stock: 8, stockMin: 5 },
  { id: "3", name: "Molinillo Manual de Cerámica", price: 525.0, stock: 0, stockMin: 5 },
  { id: "4", name: "Filtros de Papel V60 (100u)", price: 95.0, stock: 47, stockMin: 5 },
  { id: "5", name: "Prensa Francesa 1L", price: 420.0, stock: 5, stockMin: 5 },
  { id: "6", name: "Taza Cerámica Artesanal", price: 159.0, stock: 32, stockMin: 5 },
]

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
  }).format(value)
}
