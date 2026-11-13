package com.healthcare.booking.controller;

import com.healthcare.booking.dto.SpecializationDto;
import com.healthcare.booking.repository.SpecializationRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/specializations")
public class SpecializationController {

    private final SpecializationRepository repository;

    public SpecializationController(SpecializationRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<SpecializationDto> list() {
        return repository.findAllByOrderByNameAsc().stream().map(SpecializationDto::from).toList();
    }
}
