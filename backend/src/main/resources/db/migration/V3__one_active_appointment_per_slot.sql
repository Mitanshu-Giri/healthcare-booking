-- V3: database-level backstop against double booking.
--
-- The application already prevents double booking by locking the slot row inside a
-- transaction (see AppointmentService.book). This migration makes the DATABASE itself refuse
-- a second "active" appointment for the same slot, even if some future code path forgets the lock.
--
-- MySQL has no partial unique index, so we use a generated column:
--   active_slot_id = slot_id while the appointment is PENDING / CONFIRMED / COMPLETED, otherwise NULL.
-- A UNIQUE index ignores NULLs, so any number of CANCELLED / REJECTED rows can point at the same
-- slot, but only ONE active row can. Hibernate does not map this column; MySQL maintains it itself.
--
-- The column and the index are added in two separate statements on purpose.

ALTER TABLE appointments
    ADD COLUMN active_slot_id BIGINT
        GENERATED ALWAYS AS (
            CASE WHEN status IN ('PENDING', 'CONFIRMED', 'COMPLETED') THEN slot_id ELSE NULL END
        ) VIRTUAL;

ALTER TABLE appointments
    ADD CONSTRAINT uq_appt_one_active_per_slot UNIQUE (active_slot_id);
