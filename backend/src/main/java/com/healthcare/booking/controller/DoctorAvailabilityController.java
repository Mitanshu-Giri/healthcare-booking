package com.healthcare.booking.controller;

import com.healthcare.booking.dto.SlotDto;
import com.healthcare.booking.service.SlotService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

/** Public (read-only) view of one doctor's bookable slots. Kept separate from DoctorController. */
@RestController
@RequestMapping("/api/doctors/{doctorId}/slots")
public class DoctorAvailabilityController {

    private final SlotService slotService;

    public DoctorAvailabilityController(SlotService slotService) {
        this.slotService = slotService;
    }

    /** GET /api/doctors/1/slots  or  GET /api/doctors/1/slots?date=2026-11-20 */
    @GetMapping
    public List<SlotDto> availableSlots(@PathVariable Long doctorId,
                                        @RequestParam(name = "date", required = false)
                                        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return slotService.listAvailableForDoctor(doctorId, date);
    }
}
