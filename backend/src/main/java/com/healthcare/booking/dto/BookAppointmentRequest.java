package com.healthcare.booking.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** The patient is taken from the login token, so only the slot (and an optional reason) is sent. */
public record BookAppointmentRequest(

        @NotNull(message = "slotId is required")
        Long slotId,

        @Size(max = 255, message = "Reason must be at most 255 characters")
        String reason
) {
}
