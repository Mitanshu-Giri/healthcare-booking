package com.healthcare.booking.controller;

import com.healthcare.booking.dto.DoctorDto;
import com.healthcare.booking.service.DoctorService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorService doctorService;

    public DoctorController(DoctorService doctorService) {
        this.doctorService = doctorService;
    }

    /** GET /api/doctors?specializationId=2&search=priya (both parameters optional) */
    @GetMapping
    public List<DoctorDto> list(@RequestParam(required = false) Long specializationId,
                                @RequestParam(required = false) String search) {
        return doctorService.listActive(specializationId, search);
    }

    @GetMapping("/{id}")
    public DoctorDto getById(@PathVariable Long id) {
        return doctorService.getActiveById(id);
    }
}
