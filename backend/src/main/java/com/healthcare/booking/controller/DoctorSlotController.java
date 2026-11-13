package com.healthcare.booking.controller;

import com.healthcare.booking.dto.SlotDto;
import com.healthcare.booking.dto.SlotRequest;
import com.healthcare.booking.security.AuthenticatedUser;
import com.healthcare.booking.service.SlotService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Doctor-only slot management. The doctor is always taken from the JWT (never from the URL or body),
 * so a doctor can only ever touch their own slots.
 *
 * Protected twice: SecurityConfig (/api/doctor/** needs ROLE_DOCTOR) and @PreAuthorize below.
 */
@RestController
@RequestMapping("/api/doctor/slots")
@PreAuthorize("hasRole('DOCTOR')")
public class DoctorSlotController {

    private final SlotService slotService;

    public DoctorSlotController(SlotService slotService) {
        this.slotService = slotService;
    }

    @PostMapping
    public ResponseEntity<SlotDto> create(@AuthenticationPrincipal AuthenticatedUser principal,
                                          @Valid @RequestBody SlotRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(slotService.createSlot(principal.id(), request));
    }

    /** GET /api/doctor/slots?from=2026-11-20&to=2026-11-27 (both optional; default today..+30 days) */
    @GetMapping
    public List<SlotDto> mySlots(@AuthenticationPrincipal AuthenticatedUser principal,
                                 @RequestParam(name = "from", required = false)
                                 @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                 @RequestParam(name = "to", required = false)
                                 @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return slotService.listMySlots(principal.id(), from, to);
    }

    @PutMapping("/{id}")
    public SlotDto update(@AuthenticationPrincipal AuthenticatedUser principal,
                          @PathVariable Long id,
                          @Valid @RequestBody SlotRequest request) {
        return slotService.updateSlot(principal.id(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal AuthenticatedUser principal,
                                       @PathVariable Long id) {
        slotService.deleteSlot(principal.id(), id);
        return ResponseEntity.noContent().build();
    }
}
