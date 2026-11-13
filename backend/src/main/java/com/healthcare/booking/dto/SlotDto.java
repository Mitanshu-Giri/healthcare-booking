package com.healthcare.booking.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.healthcare.booking.entity.AvailabilitySlot;
import com.healthcare.booking.entity.SlotStatus;

import java.time.LocalDate;
import java.time.LocalTime;

/** doctorId is the doctor profile id, the same id used by /api/doctors/{id}. */
public record SlotDto(
        Long id,
        Long doctorId,
        @JsonFormat(pattern = "yyyy-MM-dd") LocalDate slotDate,
        @JsonFormat(pattern = "HH:mm") LocalTime startTime,
        @JsonFormat(pattern = "HH:mm") LocalTime endTime,
        SlotStatus status
) {
    public static SlotDto from(AvailabilitySlot s) {
        return new SlotDto(s.getId(), s.getDoctor().getId(), s.getSlotDate(),
                s.getStartTime(), s.getEndTime(), s.getStatus());
    }
}
