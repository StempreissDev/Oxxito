export type Customer = {
  id: string
  name: string
  phone: string
  balance: number
}

export type Movement = {
  id: string
  customerId: string
  type: "compra" | "abono"
  date: string // ISO
  amount: number
  // Solo para compras:
  productName?: string
  quantity?: number
}

export const initialCustomers: Customer[] = [
  { id: "1", name: "María Fernanda López", phone: "55 1234 5678", balance: 0 },
  { id: "2", name: "Jorge Ramírez Soto", phone: "55 8765 4321", balance: 1250.0 },
  { id: "3", name: "Ana Patricia Gómez", phone: "55 2468 1357", balance: 480.5 },
  { id: "4", name: "Carlos Mendoza Ruiz", phone: "55 9090 1122", balance: 0 },
  { id: "5", name: "Lucía Hernández Vega", phone: "55 3344 5566", balance: 3120.0 },
  { id: "6", name: "Roberto Castillo Díaz", phone: "55 7788 9900", balance: 215.0 },
]

export const weeklyPayments = 4870.0

export const initialMovements: Movement[] = [
  // Jorge Ramírez Soto (saldo 1250)
  { id: "m1", customerId: "2", type: "compra", date: "2026-05-12T10:30:00", productName: "Café de Especialidad 500g", quantity: 3, amount: 567.0 },
  { id: "m2", customerId: "2", type: "compra", date: "2026-05-20T16:05:00", productName: "Prensa Francesa 1L", quantity: 2, amount: 840.0 },
  { id: "m3", customerId: "2", type: "abono", date: "2026-05-28T09:15:00", amount: 500.0 },
  { id: "m4", customerId: "2", type: "compra", date: "2026-06-02T12:40:00", productName: "Termo de Acero Inoxidable", quantity: 1, amount: 349.5 },
  { id: "m5", customerId: "2", type: "abono", date: "2026-06-04T18:20:00", amount: 6.5 },

  // Ana Patricia Gómez (saldo 480.5)
  { id: "m6", customerId: "3", type: "compra", date: "2026-05-25T11:00:00", productName: "Molinillo Manual de Cerámica", quantity: 1, amount: 525.0 },
  { id: "m7", customerId: "3", type: "abono", date: "2026-06-01T10:10:00", amount: 200.0 },
  { id: "m8", customerId: "3", type: "compra", date: "2026-06-03T15:30:00", productName: "Filtros de Papel V60 (100u)", quantity: 2, amount: 190.0 },
  { id: "m9", customerId: "3", type: "abono", date: "2026-06-05T08:45:00", amount: 34.5 },

  // Lucía Hernández Vega (saldo 3120)
  { id: "m10", customerId: "5", type: "compra", date: "2026-04-30T09:00:00", productName: "Prensa Francesa 1L", quantity: 4, amount: 1680.0 },
  { id: "m11", customerId: "5", type: "compra", date: "2026-05-15T14:20:00", productName: "Café de Especialidad 500g", quantity: 6, amount: 1134.0 },
  { id: "m12", customerId: "5", type: "compra", date: "2026-05-29T17:50:00", productName: "Taza Cerámica Artesanal", quantity: 2, amount: 318.0 },
  { id: "m13", customerId: "5", type: "abono", date: "2026-06-02T13:00:00", amount: 12.0 },

  // Roberto Castillo Díaz (saldo 215)
  { id: "m14", customerId: "6", type: "compra", date: "2026-06-01T10:00:00", productName: "Taza Cerámica Artesanal", quantity: 1, amount: 159.0 },
  { id: "m15", customerId: "6", type: "compra", date: "2026-06-03T11:30:00", productName: "Filtros de Papel V60 (100u)", quantity: 1, amount: 95.0 },
  { id: "m16", customerId: "6", type: "abono", date: "2026-06-04T16:00:00", amount: 39.0 },

  // María Fernanda López (saldo 0 - al corriente)
  { id: "m17", customerId: "1", type: "compra", date: "2026-05-10T09:30:00", productName: "Termo de Acero Inoxidable", quantity: 1, amount: 349.5 },
  { id: "m18", customerId: "1", type: "abono", date: "2026-05-22T12:00:00", amount: 349.5 },

  // Carlos Mendoza Ruiz (saldo 0 - al corriente)
  { id: "m19", customerId: "4", type: "compra", date: "2026-05-18T15:00:00", productName: "Café de Especialidad 500g", quantity: 2, amount: 378.0 },
  { id: "m20", customerId: "4", type: "abono", date: "2026-05-30T10:30:00", amount: 378.0 },
]
