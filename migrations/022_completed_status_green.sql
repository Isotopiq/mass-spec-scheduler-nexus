-- Completed bookings display green; drop any case-variant duplicates so the
-- lookup (case-insensitive in the client) resolves to a single row.
DELETE FROM status_colors WHERE status <> 'completed' AND lower(status) = 'completed';

INSERT INTO status_colors (status, color) VALUES ('completed', '#16a34a')
ON CONFLICT (status) DO UPDATE SET color = '#16a34a', updated_at = now();
