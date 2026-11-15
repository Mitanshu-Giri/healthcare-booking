package com.healthcare.booking.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.healthcare.booking.entity.Appointment;
import com.healthcare.booking.entity.AppointmentStatus;
import com.healthcare.booking.entity.AvailabilitySlot;
import com.healthcare.booking.entity.DoctorProfile;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/** What a PATIENT sees about their own appointment (includes the doctor, never other patients). */
public record AppointmentDto(
        Long id,
        AppointmentStatus status,
        String reason,
        Long slotId,
        @JsonFormat(pattern = "yyyy-MM-dd") LocalDate slotDate,
        @JsonFormat(pattern = "HH:mm") LocalTime startTime,
        @JsonFormat(pattern = "HH:mm") LocalTime endTime,
        Long doctorId,
        String doctorName,
        String clinicAddress,
        Instant createdAt
) {
    public static AppointmentDto from(Appointment a) {
        AvailabilitySlot slot = a.getSlot();
        DoctorProfile doctor = slot.getDoctor();
        return new AppointmentDto(
                a.getId(), a.getStatus(), a.getReason(),
                slot.getId(), slot.getSlotDate(), slot.getStartTime(), slot.getEndTime(),
                doctor.getId(), doctor.getUser().getFullName(), doctor.getClinicAddress(),
                a.getCreatedAt());
    }
}
