package com.healthcare.booking.controller;

import com.healthcare.booking.dto.DoctorAppointmentDto;
import com.healthcare.booking.entity.AppointmentStatus;
import com.healthcare.booking.security.AuthenticatedUser;
import com.healthcare.booking.service.AppointmentService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Doctor-facing appointment endpoints. The doctor is always taken from the JWT, and the service
 * only finds appointments whose slot belongs to that doctor, so other doctors' appointments
 * behave exactly like non-existent ones (404).
 *
 * Protected twice: SecurityConfig (/api/doctor/** needs ROLE_DOCTOR) and @PreAuthorize.
 */
@RestController
@RequestMapping("/api/doctor/appointments")
@PreAuthorize("hasRole('DOCTOR')")
public class DoctorAppointmentController {

    private final AppointmentService appointmentService;

    public DoctorAppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    /** GET /api/doctor/appointments  or  ?status=PENDING (status in capitals). Earliest first. */
    @GetMapping
    public List<DoctorAppointmentDto> list(@AuthenticationPrincipal AuthenticatedUser principal,
                                           @RequestParam(name = "status", required = false) AppointmentStatus status) {
        return appointmentService.listForDoctor(principal.id(), status);
    }

    @PostMapping("/{id}/approve")
    public DoctorAppointmentDto approve(@AuthenticationPrincipal AuthenticatedUser principal,
                                        @PathVariable Long id) {
        return appointmentService.approve(principal.id(), id);
    }

    @PostMapping("/{id}/reject")
    public DoctorAppointmentDto reject(@AuthenticationPrincipal AuthenticatedUser principal,
                                       @PathVariable Long id) {
        return appointmentService.reject(principal.id(), id);
    }

    @PostMapping("/{id}/complete")
    public DoctorAppointmentDto complete(@AuthenticationPrincipal AuthenticatedUser principal,
                                         @PathVariable Long id) {
        return appointmentService.complete(principal.id(), id);
    }
}
