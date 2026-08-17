# Fix Schedule Delay application

The Apply Delay action currently reaches tables that have appropriate authenticated RLS policies but no explicit Data API grants. The database contains 17 future bookings and zero delay-history rows, confirming that no delay was successfully recorded.

## Changes

1. Add a targeted database migration granting:
   - `bookings`: `SELECT, INSERT, UPDATE, DELETE` to `authenticated`, and `ALL` to `service_role`.
   - `schedule_delays`: `SELECT, INSERT, UPDATE` to `authenticated`, and `ALL` to `service_role`.
   - `schedule_delay_bookings`: `SELECT, INSERT` to `authenticated`, and `ALL` to `service_role`.
   - No `anon` access; existing RLS remains authoritative and only admins can create/reverse delays.
2. Harden the delay workflow so every database write is checked and a failed history insert/update is reported clearly instead of continuing with a partial or apparently silent operation.
3. Keep the existing Delay History panel, but surface its load failure in the panel and reload it after a successful apply or reversal.
4. Verify as an authenticated admin that applying a short delay:
   - moves all eligible bookings at/after the cutoff,
   - creates the delay-history row and per-booking reversal records,
   - updates the calendar immediately,
   - leaves completed/cancelled/denied bookings unchanged,
   - and can be reversed successfully.

## Technical notes

- The grants restore PostgREST access only; they do not weaken row-level security or change the requirement that the caller is an admin.
- Booking visibility remains unchanged: signed-in users can continue seeing all bookings, while only owners or admins can modify individual bookings.
- Email failures remain non-blocking after schedule changes, but database/history failures will stop the operation and show the actual error.