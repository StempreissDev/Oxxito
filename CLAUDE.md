# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev        # Start dev server (uses --webpack flag explicitly)
pnpm build      # Production build
pnpm start      # Serve production build
pnpm lint       # Run ESLint
```

No test suite is configured. TypeScript build errors are suppressed (`ignoreBuildErrors: true` in `next.config.mjs`), so type errors won't block builds but should still be avoided.

## Architecture

**"Oxxito"** is a mobile-first PWA for small-business inventory and sales management. All UI is in Spanish. The layout is always dark mode, max-w-md centered — designed to feel like a native phone app.

### Routing (Next.js App Router)
- `/` — Product inventory (`ProductsScreen`)
- `/clientes` — Customer & receivables management (`CustomersScreen`)
- `/estadisticas` — Sales statistics with PDF export (`StatsScreen`)
- `/login` — Auth page (only public route)

Every route is wrapped in `AuthGuard` (in `app/layout.tsx`), which listens to Supabase auth state and redirects unauthenticated users to `/login`.

### Data layer
All data lives in **Supabase** (`lib/supabase.ts`). The singleton client is imported directly into components — there is no API layer or server actions.

**Database tables and their TypeScript mappings:**

| Table | Key columns | TS type |
|---|---|---|
| `productos` | `nombre`, `precio`, `stock` | `Product` (`name`, `price`, `stock`) |
| `clientes` | `nombre`, `telefono`, `saldo_pendiente`, `activo` | `Customer` (`name`, `phone`, `balance`) |
| `ventas` | `cliente_id`, `producto_id`, `cantidad`, `total`, `fecha_venta` | — |
| `abonos` | `cliente_id`, `monto`, `fecha_abono` | — |

Always translate between camelCase English (app) and Spanish snake_case (DB) when reading/writing.

### Deletion rules
- **Products**: hard-deleted only if they have zero associated `ventas`; otherwise blocked.
- **Customers**: soft-deleted (`activo = false`) if they have `ventas`; hard-deleted if they have none. The `clientes` query always filters `.or('activo.eq.true,activo.is.null')`.

### Component structure
Screens (`*-screen.tsx`) own all local state and inline their own modals — modals are not always separate files. The `SaleModal` is the most complex component: it handles product selection, quantity, three payment types (completo / despues / parcial), sequential Supabase writes, and a WhatsApp share link on success.

`inventory-screen.tsx` is a **legacy prototype** that uses local mock data (`initialProducts`) with no Supabase connection — it is not used by any route. The live products screen is `products-screen.tsx`.

`CustomerProfile` (`components/customer-profile.tsx`) shows per-customer transaction history. It queries both `ventas` and `abonos` and merges them into `Movement` objects (type defined in `lib/customers.ts`): `type: "compra" | "abono"`, with optional `productName` and `quantity` for purchases.

`StatsScreen` (`components/stats-screen.tsx`) uses **Recharts** for bar charts and **jsPDF + jspdf-autotable** for PDF export. Periods: today / week / month.

### UI stack
- Tailwind v4 — configured via `postcss.config.mjs`, no `tailwind.config.js`
- shadcn/ui components live in `components/ui/` (Button, Input, Dialog, etc.)
- `@base-ui/react` is the underlying primitive library
- `cn()` helper in `lib/utils.ts` (clsx + tailwind-merge)
- Currency always formatted as MXN via `formatCurrency` from `lib/types.ts`

### Environment variables
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
Both must be set in `.env.local` for the app to connect to Supabase.

### PWA
Service worker is disabled in development and active in production (via `@ducanh2912/next-pwa`). The manifest is at `public/manifest.json`.

### Mobile testing on LAN
`next.config.mjs` allows `192.168.1.131` via `allowedDevOrigins`. Run `pnpm dev` and open the local IP on a phone to test the PWA experience without deploying.
