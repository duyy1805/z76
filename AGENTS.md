# Codex Project Memory

## Scope
- Applies to the whole repository.
- Ignore `PLP review project/` completely. Do not inspect, modify, summarize, or include it in searches unless the user explicitly asks for that folder.

## Project Flow
- React + Vite app using MUI, Axios, React Router, Zustand auth helpers, Recharts, and Dayjs.
- Main entry: `src/main.jsx`.
- Routes live in `src/App.jsx`.
- Authenticated so-sec/check workflow uses `RequireAuth`, `Shell`, and token from `useAuth()`.
- TGSX workflow uses `RequireAuth_TGSX`, `Shell_TGSX`, and `token_tgsx`.
- Invoice page is `src/pages/invoice/HoaDon.jsx`, routed at `/invoice`.
- Check/payment request page is `src/pages/PhieuSec.jsx`, routed at `/phieu`.
- Warehouse map is public at `/warehouse-map` and uses `src/components/PLP/WarehouseMap.jsx`.

## API Notes
- So-sec API wrapper: `src/lib/api.js`.
  - Default base: `https://nodeapi.z76.vn/sosec`.
  - Login default: `https://apipccc.z76.vn/auth/loginERP`.
  - Token attach helper: `attachAuthToken(token)`.
- Invoice API wrapper: `src/lib/api_invoice.js`.
  - Default base: `https://nodeapi.z76.vn/invoice/invoice`.
  - Token attach helper: `attachInvoiceAuthToken(token)`.
- TGSX API wrapper: `src/lib/api_tgsx.js`.
- Prefer existing API wrappers over creating raw Axios calls inside pages.

## Common Commands
- Dev server: `npm run dev`.
- Production build: `npm run build`.
- Lint: `npm run lint`.

## Known Issues / Cautions
- Some Vietnamese comments in existing files show mojibake encoding. Avoid broad re-encoding churn unless the user asks.
- Keep UI changes consistent with existing MUI patterns.
- Do not change auth, approval payload shape, or API base URLs without checking the related backend contract.
- Before editing invoice or check workflows, inspect the active page and its API wrapper together.
