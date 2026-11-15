package com.healthcare.booking.controller;

import com.healthcare.booking.dto.AppointmentDto;
import com.healthcare.booking.dto.BookAppointmentRequest;
import com.healthcare.booking.entity.AppointmentStatus;
import com.healthcare.booking.security.AuthenticatedUser;
import com.healthcare.booking.service.AppointmentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Patient-facing appointment endpoints. The patient is always taken from the JWT, never from the
 * request, so a patient can only book for themselves and only see/cancel their own appointments.
 *
 * Protected twice: SecurityConfig (/api/appointments/** needs ROLE_PATIENT) and @PreAuthorize.
 */
@RestController
@RequestMapping("/api/appointments")
@PreAuthorize("hasRole('PATIENT')")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @PostMapping
    public ResponseEntity<AppointmentDto> book(@AuthenticationPrincipal AuthenticatedUser principal,
                                               @Valid @RequestBody BookAppointmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(appointmentService.book(principal.id(), request));
    }

    /** GET /api/appointments/mine  or  /api/appointments/mine?status=PENDING (status in capitals) */
    @GetMapping("/mine")
    public List<AppointmentDto> mine(@AuthenticationPrincipal AuthenticatedUser principal,
                                     @RequestParam(name = "status", required = false) AppointmentStatus status) {
        return appointmentService.listForPatient(principal.id(), status);
    }

    @PostMapping("/{id}/cancel")
    public AppointmentDto cancel(@AuthenticationPrincipal AuthenticatedUser principal,
                                 @PathVariable Long id) {
        return appointmentService.cancelByPatient(principal.id(), id);
    }
}
