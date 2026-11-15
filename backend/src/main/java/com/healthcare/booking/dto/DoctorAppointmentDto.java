package com.healthcare.booking.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.healthcare.booking.entity.Appointment;
import com.healthcare.booking.entity.AppointmentStatus;
import com.healthcare.booking.entity.AvailabilitySlot;
import com.healthcare.booking.entity.User;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/** What a DOCTOR sees about an appointment on their own schedule: the patient's name and phone, no email. */
public record DoctorAppointmentDto(
        Long id,
        AppointmentStatus status,
        String reason,
        Long slotId,
        @JsonFormat(pattern = "yyyy-MM-dd") LocalDate slotDate,
        @JsonFormat(pattern = "HH:mm") LocalTime startTime,
        @JsonFormat(pattern = "HH:mm") LocalTime endTime,
        Long patientId,
        String patientName,
        String patientPhone,
        Instant createdAt
) {
    public static DoctorAppointmentDto from(Appointment a) {
        AvailabilitySlot slot = a.getSlot();
        User patientUser = a.getPatient().getUser();
        return new DoctorAppointmentDto(
                a.getId(), a.getStatus(), a.getReason(),
                slot.getId(), slot.getSlotDate(), slot.getStartTime(), slot.getEndTime(),
                a.getPatient().getId(), patientUser.getFullName(), patientUser.getPhone(),
                a.getCreatedAt());
    }
}
