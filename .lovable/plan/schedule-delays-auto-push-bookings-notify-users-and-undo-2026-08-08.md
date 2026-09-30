# Schedule Delays: auto-push bookings, notify users, and undo

Make the admin "Delays" tab actually shift bookings, email every affected user their new start time, and keep a history of applied delays so any one of them can be reversed later.

## How it works for the admin

1. In Administration -> Delays, the admin picks a date, a start time (cutoff), a delay duration in minutes, an optional instrument filter (default: all instruments), and a reason.
2. On submit, every booking whose start time is at or after the cutoff — excluding completed, cancelled, and denied bookings — is pushed forward by the delay amount.
3. Each affected user gets an email naming the instrument, the delay length, the reason, and the new start and end time of their booking.
4. Below the form, a "Delay history" list shows each delay that has been applied: when, by whom, cutoff, minutes, instrument scope, reason, how many bookings moved, and its status (applied or reversed).
5. Each applied entry has a "Reverse" button. Reversing restores each booking to its exact original start/end time as recorded when the delay was applied, and emails those users again telling them their booking has been restored to the original time.
6. Bookings that were deleted or independently rescheduled after the delay are skipped on reverse, and the admin sees a summary of how many were restored vs. skipped.

## Database changes

Two new tables:

- `schedule_delays` — one row per delay event: cutoff time, delay minutes, optional instrument id, reason, admin who applied it, affected booking count, status (`applied` / `reversed`), reversal timestamp.
- `schedule_delay_bookings` — one row per shifted booking: delay id, booking id, original start, original end, new start, new end. This is what makes an exact reversal possible.

Access rules: any signed-in user may read the delay history (the app already shows all bookings to all users); only admins can create delays or mark them reversed. Both tables get the required grants and row-level security policies.

## Technical notes

- New hook `src/hooks/useScheduleDelays.ts` handles: `applyDelay(...)`, `reverseDelay(delayId)`, and `loadDelays()`, writing to the two new tables and updating `bookings`.
- `src/components/admin/DelaySchedule.tsx` is rewritten to use `OptimizedBookingContext` (it currently imports the legacy `BookingContext`, which per project rules must not be used) plus the new hook, and gains the instrument dropdown and the history list.
- `applyDelay` in `OptimizedBookingContext` is updated to delegate to the new hook logic so the two implementations don't diverge; the legacy `useBookings.applyDelay` is left alone.
- Booking updates run sequentially in descending start-time order so the existing `prevent_booking_overlap` database trigger never sees a transient collision. On reverse, order is ascending. Any booking whose update is rejected by the trigger is reported to the admin rather than silently dropped.
- Emails go through the existing `sendEmail` helper and `send-email` edge function. Two new template types are added: `booking_delayed` and `booking_delay_reversed`, with variables `userName`, `instrumentName`, `delayMinutes`, `reason`, `oldStartDate`, `newStartDate`, `newEndDate`. `createDelayNotification` in `src/utils/emailNotifications.ts` is extended to include the new times and reason, and a matching reversal notification is added.
- The Email Templates admin tab gets tabs for the two new template types with default HTML matching the existing template styling.
- Emails are sent after all database updates succeed, so a mail failure never leaves the schedule half-shifted; failures are logged and surfaced as a non-blocking warning.
