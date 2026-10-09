# SOHAN PIPELINES — Admin Panel

Premium operations console for **SOHAN PIPELINES**, a plumbing services and
plumbing spare-parts business operating across West Bengal, India.

> **Frontend only.** There is no backend, database, authentication service or
> API integration in this project. Every screen runs on realistic local mock
> data so the interface behaves like a finished product while staying ready for
> a real API later.

## Tech stack

- **TanStack Start v1** (React 19, file-based routing, SSR-capable)
- **Vite 8** build tooling
- **Tailwind CSS v4** (CSS-first design tokens in `src/styles.css`)
- **shadcn/ui** + Radix primitives
- **Recharts** for analytics visualisations
- **Sonner** for toast feedback, **cmdk** for the command palette
- **TypeScript** in strict mode

## Getting started

```bash
bun install      # or npm install
bun run dev      # http://localhost:8080
bun run build    # production build
bun run lint     # eslint
```

Copy `.env.example` to `.env` if you want to start wiring configuration for a
future backend. The app runs fine without it.

## Pages

| Route             | What it covers                                                              |
| ----------------- | --------------------------------------------------------------------------- |
| `/`               | Operations dashboard — KPIs, booking & revenue charts, performance, activity |
| `/technicians`    | Technician directory + detail profile with performance and job history       |
| `/bookings`       | Booking table with search, filters, sorting, pagination, detail drawer       |
| `/services`       | Service catalogue with create / edit / delete and active toggles             |
| `/service-areas`  | West Bengal coverage, A–Z grouped, normalized cities with merged PIN codes   |
| `/customers`      | Customer directory + profile with bookings, payments, notes, activity        |
| `/reports`        | Analytics for bookings, revenue, services, technicians, customers, cancels   |
| `/spare-parts`    | Inventory, low-stock alerts, stock movement, parts used in bookings          |
| `/billing`        | Invoices, payments, refunds and a print-ready INR invoice preview            |
| `/profile`        | Admin identity and business information                                      |
| `/settings`       | General, appearance, notifications, bookings, services, billing, security, API |

## Architecture

```
src/
  components/
    common/        reusable presentation blocks (stat card, chart card, badges…)
    layout/        app shell, sidebar navigation, command palette
    ui/            shadcn/ui primitives
    theme-provider.tsx
  hooks/           small UI hooks (mock loading state, mobile detection)
  lib/
    mock-data.ts   single source of mock data, typed like future API responses
    format.ts      INR / date / number formatters (en-IN)
  routes/          file-based routes, one file per page
  styles.css       design tokens, theme variables, custom utilities
```

**Swapping in a real API later:** every page imports typed data from
`src/lib/mock-data.ts`. Replace those exports with data-fetching functions
(TanStack Query + route loaders) and the components keep working — the types are
already the intended response shapes.

## Design system

All colours, gradients, shadows and typography live as semantic tokens in
`src/styles.css` (`oklch` values, light and dark). Components never hardcode
colour utilities. The palette is a deep graphite + hydro teal-blue primary with
a copper accent, chosen to read as an engineering-grade operations tool.

## UX features

Collapsible desktop sidebar, mobile drawer, global search, `⌘K`/`Ctrl+K` command
palette, notifications panel, breadcrumbs, profile menu, light/dark mode, page
transitions, skeleton loading, empty states, toast feedback and keyboard-friendly
controls.

## Data note

All names, phone numbers, addresses, PIN codes, prices, invoices and suppliers
are realistic but fictional sample data created for this demo.
