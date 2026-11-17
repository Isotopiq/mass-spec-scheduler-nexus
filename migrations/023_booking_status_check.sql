-- Guard bookings.status against values outside the known lifecycle.
--
-- Rows written with an empty/invalid status (accepted before server-side status
-- validation existed) were visible in the calendar and history but behaved
-- inconsistently across the conflict check and the status-only fast path, and
-- produced groups of identical overlapping rows. Normalize any such rows to
-- 'pending' (the state they were created as; admins can deny duplicates) and
-- then enforce the allowed set at the database level so no code path — REST,
-- hand-run SQL, or a future endpoint — can write an invalid status again.

UPDATE bookings
SET status = 'pending'
WHERE status NOT IN ('pending', 'confirmed', 'cancelled', 'denied', 'in_progress', 'completed');

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_valid
  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'denied', 'in_progress', 'completed'));
