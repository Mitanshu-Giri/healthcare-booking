package com.healthcare.booking.service;

import com.healthcare.booking.dto.SlotDto;
import com.healthcare.booking.dto.SlotRequest;
import com.healthcare.booking.entity.ApprovalStatus;
import com.healthcare.booking.entity.AvailabilitySlot;
import com.healthcare.booking.entity.DoctorProfile;
import com.healthcare.booking.entity.SlotStatus;
import com.healthcare.booking.exception.ApiException;
import com.healthcare.booking.repository.AvailabilitySlotRepository;
import com.healthcare.booking.repository.DoctorProfileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class SlotService {

    private static final int MIN_SLOT_MINUTES = 10;
    private static final int MAX_SLOT_MINUTES = 180;
    private static final int MAX_DAYS_AHEAD = 90;
    private static final int DEFAULT_VIEW_DAYS = 30;
    private static final long NO_SLOT = -1L; // "exclude nothing" for the overlap query on create

    private final AvailabilitySlotRepository slotRepository;
    private final DoctorProfileRepository doctorRepository;
    private final ZoneId zone;

    public SlotService(AvailabilitySlotRepository slotRepository,
                       DoctorProfileRepository doctorRepository,
                       @Value("${app.timezone:Asia/Kolkata}") String timezone) {
        this.slotRepository = slotRepository;
        this.doctorRepository = doctorRepository;
        this.zone = ZoneId.of(timezone);
    }

    // ---------------------------------------------------------------- doctor side

    @Transactional
    public SlotDto createSlot(Long userId, SlotRequest request) {
        DoctorProfile doctor = lockApprovedDoctor(userId);

        LocalDate day = request.slotDate();
        LocalTime start = minutes(request.startTime());
        LocalTime end = minutes(request.endTime());
        validateSlot(day, start, end);
        ensureNoOverlap(doctor.getId(), day, start, end, NO_SLOT);

        AvailabilitySlot saved = slotRepository.saveAndFlush(new AvailabilitySlot(doctor, day, start, end));
        return SlotDto.from(saved);
    }

    @Transactional(readOnly = true)
    public List<SlotDto> listMySlots(Long userId, LocalDate from, LocalDate to) {
        DoctorProfile doctor = doctorRepository.findByUserId(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "No doctor profile exists for this account"));

        LocalDate firstDay = (from != null) ? from : LocalDate.now(zone);
        LocalDate lastDay = (to != null) ? to : firstDay.plusDays(DEFAULT_VIEW_DAYS);
        if (lastDay.isBefore(firstDay)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "'to' date must not be before 'from' date");
        }
        if (ChronoUnit.DAYS.between(firstDay, lastDay) > MAX_DAYS_AHEAD) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Date range can be at most " + MAX_DAYS_AHEAD + " days");
        }

        return slotRepository.findForDoctor(doctor.getId(), firstDay, lastDay)
                .stream().map(SlotDto::from).toList();
    }

    @Transactional
    public SlotDto updateSlot(Long userId, Long slotId, SlotRequest request) {
        DoctorProfile doctor = lockApprovedDoctor(userId);
        AvailabilitySlot slot = findOwnedSlot(doctor, slotId);
        requireAvailable(slot, "changed");

        LocalDate day = request.slotDate();
        LocalTime start = minutes(request.startTime());
        LocalTime end = minutes(request.endTime());
        validateSlot(day, start, end);
        ensureNoOverlap(doctor.getId(), day, start, end, slot.getId()); // ignore the slot itself

        slot.reschedule(day, start, end);
        return SlotDto.from(slotRepository.saveAndFlush(slot));
    }

    @Transactional
    public void deleteSlot(Long userId, Long slotId) {
        DoctorProfile doctor = lockApprovedDoctor(userId);
        AvailabilitySlot slot = findOwnedSlot(doctor, slotId);
        requireAvailable(slot, "deleted");
        slotRepository.delete(slot);
    }

    // ---------------------------------------------------------------- patient / public side

    /** Future, still-AVAILABLE slots of an active doctor. Optional single day filter. */
    @Transactional(readOnly = true)
    public List<SlotDto> listAvailableForDoctor(Long doctorId, LocalDate day) {
        doctorRepository.findActiveById(doctorId, ApprovalStatus.APPROVED)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Doctor not found"));

        LocalDate today = LocalDate.now(zone);
        LocalDate firstDay;
        LocalDate lastDay;
        if (day != null) {
            if (day.isBefore(today)) {
                return List.of();
            }
            firstDay = day;
            lastDay = day;
        } else {
            firstDay = today;
            lastDay = today.plusDays(DEFAULT_VIEW_DAYS);
        }

        LocalDateTime now = LocalDateTime.now(zone);
        return slotRepository.findForDoctorByStatus(doctorId, SlotStatus.AVAILABLE, firstDay, lastDay)
                .stream()
                // hide slots that already started earlier today
                .filter(s -> LocalDateTime.of(s.getSlotDate(), s.getStartTime()).isAfter(now))
                .map(SlotDto::from)
                .toList();
    }

    // ---------------------------------------------------------------- helpers

    /** Finds the logged-in doctor's profile and locks it. Only APPROVED doctors may manage slots. */
    private DoctorProfile lockApprovedDoctor(Long userId) {
        DoctorProfile doctor = doctorRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "No doctor profile exists for this account"));
        if (doctor.getApprovalStatus() != ApprovalStatus.APPROVED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Your doctor account is not approved yet");
        }
        return doctor;
    }

    /** 404 (not 403) when the slot belongs to someone else, so ids of other doctors' slots are not revealed. */
    private AvailabilitySlot findOwnedSlot(DoctorProfile doctor, Long slotId) {
        return slotRepository.findOwnedForUpdate(slotId, doctor.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Slot not found"));
    }

    private void requireAvailable(AvailabilitySlot slot, String action) {
        if (slot.getStatus() != SlotStatus.AVAILABLE) {
            throw new ApiException(HttpStatus.CONFLICT, "A booked slot cannot be " + action);
        }
    }

    private void validateSlot(LocalDate day, LocalTime start, LocalTime end) {
        if (!end.isAfter(start)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "End time must be after start time");
        }
        long length = Duration.between(start, end).toMinutes();
        if (length < MIN_SLOT_MINUTES || length > MAX_SLOT_MINUTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Slot length must be between " + MIN_SLOT_MINUTES + " and " + MAX_SLOT_MINUTES + " minutes");
        }
        if (!LocalDateTime.of(day, start).isAfter(LocalDateTime.now(zone))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Slot must start in the future");
        }
        if (day.isAfter(LocalDate.now(zone).plusDays(MAX_DAYS_AHEAD))) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Slots can be created at most " + MAX_DAYS_AHEAD + " days ahead");
        }
    }

    private void ensureNoOverlap(Long doctorId, LocalDate day, LocalTime start, LocalTime end, Long excludeSlotId) {
        if (slotRepository.countOverlapping(doctorId, day, start, end, excludeSlotId) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "This time overlaps with another slot of yours");
        }
    }

    private LocalTime minutes(LocalTime time) {
        return time.truncatedTo(ChronoUnit.MINUTES);
    }
}
