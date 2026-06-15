# Codex Project Memory

## Scope
- Applies to the whole `z76` frontend repository.
- Backend routes and SQL for the so-sec workflow live outside this repo, usually under `D:\Code\QLHD\server\routes`.
- Ignore `PLP review project/` completely. Do not inspect, modify, summarize, or include it in searches unless the user explicitly asks for that folder.
- There may be user changes already present. Do not revert unrelated edits.

## Tech Stack
- React + Vite frontend.
- UI: MUI components and MUI icons.
- Routing: React Router, routes defined in `src/App.jsx`.
- API: Axios wrappers under `src/lib`.
- State/auth: existing Zustand auth helpers.
- Charts: Recharts.
- Dates: Dayjs.

## Common Commands
- Dev server: `npm run dev`.
- Production build: `npm run build`.
- Lint: `npm run lint`.
- Run `npm run build` after meaningful frontend changes.

## Main Frontend Areas
- Entry point: `src/main.jsx`.
- App routes: `src/App.jsx`.
- Main authenticated shell: `RequireAuth`, `Shell`, token from `useAuth()`.
- So-sec/check workflow page: `src/pages/PhieuSec.jsx`, route `/phieu`.
- So-sec dashboard: `src/pages/Dashboard.jsx`.
- Status chip labels: `src/components/StatusChip.jsx`.
- So-sec API wrapper: `src/lib/api.js`.
- Invoice page: `src/pages/invoice/HoaDon.jsx`, route `/invoice`.
- Invoice API wrapper: `src/lib/api_invoice.js`.
- TGSX workflow uses `RequireAuth_TGSX`, `Shell_TGSX`, and `token_tgsx`.
- TGSX API wrapper: `src/lib/api_tgsx.js`.
- Warehouse map is public at `/warehouse-map` and uses `src/components/PLP/WarehouseMap.jsx`.

## API Notes
- So-sec frontend API wrapper: `src/lib/api.js`.
  - Default base: `https://nodeapi.z76.vn/sosec`.
  - Login default: `https://apipccc.z76.vn/auth/loginERP`.
  - Token attach helper: `attachAuthToken(token)`.
- Invoice API wrapper: `src/lib/api_invoice.js`.
  - Default base: `https://nodeapi.z76.vn/invoice/invoice`.
  - Token attach helper: `attachInvoiceAuthToken(token)`.
- Prefer existing API wrappers over raw Axios calls inside pages.
- Backend so-sec route is usually `D:\Code\QLHD\server\routes\sosec.js`.
- SQL snapshot/migration files relevant to so-sec may be in this repo:
  - `sosec.sql`
  - `sosec_nhap_migration.sql`

## So-Sec Draft Workflow
- Status code `KhoiTao` means `Nháp`.
- Creating a new phiếu séc must save as `KhoiTao`, not `ChoDuyet_TBP`.
- Creating a draft must not send push notifications to TBP.
- The creator or Admin submits a draft by calling `POST /phieu/:id/submit`.
- Submit calls stored procedure `SS_sp_PhieuSec_Trinh`, changes status from `KhoiTao` to `ChoDuyet_TBP`, then sends push to TBP users.
- Normal approval flow after submit remains:
  - `ChoDuyet_TBP`
  - `ChoDuyet_KTT`
  - `ChoDuyet_GD` when required
  - `HoanThanh`
- Returning a phiếu from later steps should move it back to `KhoiTao` so the creator can edit and submit again.
- Rejection still uses `TuChoi`.
- Creator edit is allowed only while `KhoiTao`, or Admin.
- Creator delete is allowed for `KhoiTao` and `TuChoi`; avoid allowing creator deletion after submit unless explicitly requested.
- Don vi huong thu edits tied to a phiếu should only be allowed for the creator while the phiếu is `KhoiTao`, or Admin.
- In the action column, use four compact slots:
  - edit/return
  - submit or approve
  - reject
  - delete
- For draft rows, the submit icon replaces the approve check icon slot instead of adding an extra action column.

## Stored Procedure Expectations
- `SS_sp_PhieuSec_Tao` must insert `TrangThaiId` from `MaTrangThai = N'KhoiTao'`.
- `SS_sp_PhieuSec_Trinh` must:
  - accept `@PhieuSecId`, `@RequesterUserId`;
  - allow only creator or Admin;
  - allow only current status `KhoiTao`;
  - update to `ChoDuyet_TBP`;
  - return the updated phiếu plus TBP user ids for push.
- `SS_sp_PhieuSec_Update` must only update `KhoiTao` phiếu by creator/Admin.
- `SS_sp_PhieuSec_Duyet` with `@TraLai = 1` must update back to `KhoiTao`.
- `SS_sp_PhieuSec_Xoa` should allow creator delete only for `KhoiTao` or `TuChoi`, and Admin as needed.

## UI Conventions
- Keep UI changes consistent with existing MUI patterns.
- Use MUI icons for action buttons.
- Keep table action columns compact and fixed-width so sticky columns do not overlap or overflow.
- Status label for `KhoiTao` should display as `Nháp`.
- Create dialog text should say `Lưu nháp`.
- Avoid adding explanatory in-app text unless it is part of a real workflow.

## Encoding / Cautions
- Some Vietnamese comments and strings in existing files show mojibake encoding. Avoid broad re-encoding churn unless the user asks.
- Prefer focused edits; do not reformat whole large files.
- Do not change auth, approval payload shape, or API base URLs without checking the related backend contract.
- Before editing invoice or check workflows, inspect the active page and its API wrapper together.
