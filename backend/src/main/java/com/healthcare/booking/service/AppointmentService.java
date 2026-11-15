package com.healthcare.booking.service;

import com.healthcare.booking.dto.AppointmentDto;
import com.healthcare.booking.dto.BookAppointmentRequest;
import com.healthcare.booking.dto.DoctorAppointmentDto;
import com.healthcare.booking.entity.Appointment;
import com.healthcare.booking.entity.AppointmentStatus;
import com.healthcare.booking.entity.ApprovalStatus;
import com.healthcare.booking.entity.AvailabilitySlot;
import com.healthcare.booking.entity.DoctorProfile;
import com.healthcare.booking.entity.PatientProfile;
import com.healthcare.booking.entity.SlotStatus;
import com.healthcare.booking.exception.ApiException;
import com.healthcare.booking.repository.AppointmentRepository;
import com.healthcare.booking.repository.AvailabilitySlotRepository;
import com.healthcare.booking.repository.PatientProfileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

/**
 * Appointment booking and lifecycle.
 *
 * CONCURRENCY RULE (read this before changing anything):
 *  Every method that changes a slot or an appointment first locks the SLOT row
 *  (SELECT ... FOR UPDATE), and only then touches the appointment. The same order everywhere
 *  means two requests for the same slot run strictly one after another and can never deadlock.
 *  Example: two patients book the same slot at the same moment. The first one gets the lock,
 *  marks the slot BOOKED and commits. The second one then gets the lock, sees BOOKED and gets 409.
 *  The unique index added in V3 is a second, database-level safety net.
 */
@Service
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final AvailabilitySlotRepository slotRepository;
    private final PatientProfileRepository patientRepository;
    private final ZoneId zone;

    public AppointmentService(AppointmentRepository appointmentRepository,
                              AvailabilitySlotRepository slotRepository,
                              PatientProfileRepository patientRepository,
                              @Value("${app.timezone:Asia/Kolkata}") String timezone) {
        this.appointmentRepository = appointmentRepository;
        this.slotRepository = slotRepository;
        this.patientRepository = patientRepository;
        this.zone = ZoneId.of(timezone);
    }

    // ================================================================ patient side

    @Transactional
    public AppointmentDto book(Long userId, BookAppointmentRequest request) {
        PatientProfile patient = patientRepository.findByUserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "No patient profile exists for this account"));

        // Lock the slot row. Anyone else trying to book (or change) this slot waits here until we commit.
        AvailabilitySlot slot = slotRepository.findByIdForUpdate(request.slotId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Slot not found"));

        DoctorProfile doctor = slot.getDoctor();
        if (doctor.getApprovalStatus() != ApprovalStatus.APPROVED || !doctor.getUser().isEnabled()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Slot not found"); // inactive doctors stay hidden
        }
        if (slot.getStatus() != SlotStatus.AVAILABLE) {
            throw new ApiException(HttpStatus.CONFLICT, "This slot has already been booked");
        }
        if (!startsInFuture(slot)) {
            throw new ApiException(HttpStatus.CONFLICT, "This slot is no longer available");
        }

        slot.markBooked();
        Appointment saved = appointmentRepository.saveAndFlush(
                new Appointment(patient, slot, cleanReason(request.reason())));
        return AppointmentDto.from(saved);
    }

    @Transactional(readOnly = true)
    public List<AppointmentDto> listForPatient(Long userId, AppointmentStatus status) {
        return appointmentRepository.findForPatient(userId).stream()
                .filter(a -> status == null || a.getStatus() == status)
                .map(AppointmentDto::from)
                .toList();
    }

    @Transactional
    public AppointmentDto cancelByPatient(Long userId, Long appointmentId) {
        Locked locked = lockSlotAndAppointment(appointmentId,
                appointmentRepository.findSlotIdForPatient(appointmentId, userId));
        Appointment appointment = locked.appointment();
        AvailabilitySlot slot = locked.slot();

        if (appointment.getStatus() != AppointmentStatus.PENDING
                && appointment.getStatus() != AppointmentStatus.CONFIRMED) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Only PENDING or CONFIRMED appointments can be cancelled (this one is "
                            + appointment.getStatus() + ")");
        }
        if (!startsInFuture(slot)) {
            throw new ApiException(HttpStatus.CONFLICT, "An appointment cannot be cancelled after its start time");
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        slot.markAvailable(); // the slot can be booked by someone else again
        appointmentRepository.saveAndFlush(appointment);
        return AppointmentDto.from(appointment);
    }

    // ================================================================ doctor side

    @Transactional(readOnly = true)
    public List<DoctorAppointmentDto> listForDoctor(Long userId, AppointmentStatus status) {
        return appointmentRepository.findForDoctor(userId).stream()
                .filter(a -> status == null || a.getStatus() == status)
                .map(DoctorAppointmentDto::from)
                .toList();
    }

    @Transactional
    public DoctorAppointmentDto approve(Long userId, Long appointmentId) {
        Locked locked = lockForDoctor(userId, appointmentId);
        Appointment appointment = locked.appointment();

        requireStatus(appointment, AppointmentStatus.PENDING, "approved");
        if (!startsInFuture(locked.slot())) {
            throw new ApiException(HttpStatus.CONFLICT, "The slot time has already passed, so this request cannot be approved");
        }

        appointment.setStatus(AppointmentStatus.CONFIRMED);
        appointmentRepository.saveAndFlush(appointment);
        return DoctorAppointmentDto.from(appointment);
    }

    @Transactional
    public DoctorAppointmentDto reject(Long userId, Long appointmentId) {
        Locked locked = lockForDoctor(userId, appointmentId);
        Appointment appointment = locked.appointment();

        requireStatus(appointment, AppointmentStatus.PENDING, "rejected");

        appointment.setStatus(AppointmentStatus.REJECTED);
        locked.slot().markAvailable(); // rejected -> the slot is free again
        appointmentRepository.saveAndFlush(appointment);
        return DoctorAppointmentDto.from(appointment);
    }

    /** Extra (not in the original list): CONFIRMED -> COMPLETED, only once the slot has started. */
    @Transactional
    public DoctorAppointmentDto complete(Long userId, Long appointmentId) {
        Locked locked = lockForDoctor(userId, appointmentId);
        Appointment appointment = locked.appointment();

        requireStatus(appointment, AppointmentStatus.CONFIRMED, "completed");
        if (startsInFuture(locked.slot())) {
            throw new ApiException(HttpStatus.CONFLICT, "An appointment can be completed only after its start time");
        }

        appointment.setStatus(AppointmentStatus.COMPLETED); // the slot stays BOOKED
        appointmentRepository.saveAndFlush(appointment);
        return DoctorAppointmentDto.from(appointment);
    }

    // ================================================================ helpers

    private record Locked(AvailabilitySlot slot, Appointment appointment) {
    }

    private Locked lockForDoctor(Long userId, Long appointmentId) {
        Locked locked = lockSlotAndAppointment(appointmentId,
                appointmentRepository.findSlotIdForDoctor(appointmentId, userId));
        if (locked.slot().getDoctor().getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Your doctor account is not approved");
        }
        return locked;
    }

    /**
     * ownedSlotId is empty when the appointment does not exist OR belongs to someone else.
     * Both give the same 404, so ids of other people's appointments are not revealed.
     * Lock order: slot first, appointment second (see class comment).
     */
    private Locked lockSlotAndAppointment(Long appointmentId, Optional<Long> ownedSlotId) {
        Long slotId = ownedSlotId
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Appointment not found"));
        AvailabilitySlot slot = slotRepository.findByIdForUpdate(slotId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Appointment not found"));
        // Re-read under the lock so the status we check is the latest committed one.
        Appointment appointment = appointmentRepository.findByIdForUpdate(appointmentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Appointment not found"));
        return new Locked(slot, appointment);
    }

    private void requireStatus(Appointment appointment, AppointmentStatus required, String action) {
        if (appointment.getStatus() != required) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Only " + required + " appointments can be " + action
                            + " (this one is " + appointment.getStatus() + ")");
        }
    }

    private boolean startsInFuture(AvailabilitySlot slot) {
        return LocalDateTime.of(slot.getSlotDate(), slot.getStartTime()).isAfter(LocalDateTime.now(zone));
    }

    private String cleanReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return null;
        }
        return reason.trim();
    }
}
