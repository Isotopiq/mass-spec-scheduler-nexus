---
name: Mass Spec Scheduler End-to-End Testing
description: How to run E2E tests against the standalone Postgres/Vite stack on http://localhost:41783
---

# Mass Spec Scheduler – End-to-End Testing Guide

## Target stack

- URL: `http://localhost:41783`
- Docker container: `lab-management-system` (port 41783 on host maps to 3000 in container)
- Database: Postgres container `lab-management-db`, database `mass_spec_scheduler`
- Standalone auth in `src/integrations/supabase/client.ts` stores `standalone_auth_token` and `standalone_auth_user` in `localStorage`

## Default seeded admin

- Email: `admin@example.com`
- Password: `admin123`
- Token is a JWT issued by the Express server; you can swap it by logging in or signing in via `/api/auth/signin`

## Non-admin test user setup

- There are no seeded non-admin users. Create one via `POST /api/auth/signup` with `{ email, password, name, department }`.
- To test a second user, sign up and then set the password (because the Admin > Users "Password" button/dialog was not responsive during automation).

## Browser-automation gotchas

- The app uses a custom `Select` (Radix/shadcn) with a hidden native `<select>`. The visible trigger can be opened and an option selected with JavaScript `.click()`, but the dialog's controlled `Purpose`/`datetime-local` inputs do not enable the Submit/Schedule button when values are set programmatically. For reliable booking/maintenance creation, use API workarounds or trigger real keyboard input.
- Login form inputs sometimes do not receive keystrokes until focused via JavaScript: `document.querySelector('input[name=email]').focus()`. If the login form remains flaky, use `/api/auth/signin` + `localStorage` token injection.
- Avatar/logout dropdown also did not open on click; use `localStorage.clear()` + reload to switch users.
- Coordinate scaling: `getBoundingClientRect()` returns CSS pixels for the actual viewport (`innerWidth` 1600, `innerHeight` 1069 on a maximized window). The desktop tool coordinate space is 1024x768, so multiply CSS X by ~0.64 and CSS Y by ~0.72, and add a browser-chrome Y offset. Alternatively, use JavaScript `.click()` on the element itself.
- The notifications bell dropdown did not open reliably under automation in the latest run; verify notifications at `/notifications` as a fallback.
- Analytics `Status` tab now switches and renders after the controlled-tabs fix.

## Standalone auth token injection workaround

If the login form is flaky, obtain tokens from `/api/auth/signin` and inject directly into `localStorage`:

```javascript
localStorage.setItem('standalone_auth_token', '<bare JWT string>');
localStorage.setItem('standalone_auth_user', JSON.stringify({ id, email, name, role, department, ... }));
window.location.href = '/dashboard';
```

Important: `standalone_auth_token` must be the **bare JWT string**, not the full JSON session object. `standalone_auth_user` must be the JSON user object.

## API shortcuts for setup and verification

- `POST /api/auth/signup` – create a test user
- `POST /api/auth/signin` – get tokens
- `POST /api/rest/query` – CRUD for allowed tables (authenticated/admin). Note that the import endpoint writes users to `profiles`, not a `users` table, and querying `table=users` may return `null`.
- `POST /api/bookings/recurring` – create recurring bookings. Conflicts (maintenance or existing bookings) are returned in the `skipped` array.
- `POST /api/admin/import/:type` and `GET /api/admin/export/:type` – bulk import/export (`users`, `instruments`, `bookings`). Import accepts CSV or XLSX.
- `POST /api/bookings/:id/check-in` / `check-out` – admin-only; sets `checked_in_at`, `actual_start_time`, `checked_out_at`, `actual_end_time`, and status.

## Injecting a CSV/Excel file for UI import testing

The file input can be populated programmatically by creating a `File` and `DataTransfer` so the Import button enables:

```javascript
const csv = "name,email,role,department\nImport User,import@example.com,user,QA";
const file = new File([csv], "test_users.csv", { type: "text/csv" });
const dt = new DataTransfer();
dt.items.add(file);
const input = document.querySelector('input[type="file"]');
input.files = dt.files;
input.dispatchEvent(new Event('change', { bubbles: true }));
```

## Data constraints to watch

- `app_settings.max_booking_days_ahead` defaults to `365` in a freshly reset DB (was `7` in earlier seeds); the UI date picker only lets users pick within that window.
- `booking_templates` exists in the schema but has no UI. Columns: `user_id`, `name`, `instrument_id`, `start_time` (`time` type), `duration_minutes` (integer), `purpose`, `details`.
- SMTP is not configured in the Docker stack, so status-change notifications are created in-app but email sending throws `SMTP not configured`. Email template preview should still render with the `{{logoUrl}}` header.

## Common workflows to exercise

1. Admin sign-in → verify `/dashboard` loads and Admin link is visible.
2. Non-admin sign-in → verify no Admin link.
3. Booking lifecycle: create, recurring, approve, swap, cancel. Use API for creation if the booking-form Select controls do not respond.
4. Waitlist: attempt to book a full slot (UI or API), then delete the blocker booking and verify auto-fill.
5. Quotas: create `usage_quota_periods` and `usage_quotas` entries, then attempt an over-limit booking.
6. Maintenance: the backend rejects overlapping maintenance and overlapping bookings when scheduling maintenance.
7. Notifications: trigger status changes and verify notifications in `/notifications` or the bell dropdown.
8. Analytics: summary cards (`Total Bookings`, `Avg Duration`, `Check-ins`, `No-shows`) and the `Status` tab.
9. Check-in/check-out on a confirmed booking (desktop and mobile).
10. Mobile: narrow viewport, hamburger menu, and navigation.

## Devin Secrets Needed

- None for local Docker testing; admin credentials are hard-coded defaults.
