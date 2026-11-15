package com.healthcare.booking.entity;

/**
 * Matches appointments.status.
 *
 * Allowed moves (enforced in AppointmentService):
 *   PENDING   -> CONFIRMED  (doctor approves)
 *   PENDING   -> REJECTED   (doctor rejects, slot is freed)
 *   PENDING   -> CANCELLED  (patient cancels, slot is freed)
 *   CONFIRMED -> CANCELLED  (patient cancels before it starts, slot is freed)
 *   CONFIRMED -> COMPLETED  (doctor completes after it started)
 * REJECTED, CANCELLED and COMPLETED are final.
 */
public enum AppointmentStatus {
    PENDING,
    CONFIRMED,
    REJECTED,
    CANCELLED,
    COMPLETED
}
