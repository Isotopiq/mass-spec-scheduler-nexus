-- Guard bookings.status against values outside the app's real lifecycle.
--
-- Rows written with an empty/invalid status (accepted before server-side status
-- validation existed) rendered as overlapping duplicates in the calendar and
-- history. Normalize any such rows to 'pending' (the state they were created
-- as; admins can deny duplicates) and then enforce the allowed set.
--
-- The allowed set covers every status the app writes, matched
-- case-insensitively: REST flows ('pending', 'confirmed', 'cancelled',
-- 'denied'), check-in/check-out ('in_progress', 'completed'), and the admin
-- edit dialog's capitalized options ('In-Progress', 'Not-Started', 'Delayed',
-- 'Completed'). Existing rows keep their stored casing; the UI compares
-- statuses case-sensitively in several places.

UPDATE bookings
SET status = 'pending'
WHERE lower(status) NOT IN (
  'pending', 'confirmed', 'cancelled', 'denied',
  'in_progress', 'in-progress', 'not_started', 'not-started',
  'completed', 'delayed'
);

ALTER TABLE bookings
  ADD CONSTRAINT bookings_status_valid
  CHECK (lower(status) IN (
    'pending', 'confirmed', 'cancelled', 'denied',
    'in_progress', 'in-progress', 'not_started', 'not-started',
    'completed', 'delayed'
  ));
