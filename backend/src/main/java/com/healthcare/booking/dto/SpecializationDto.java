package com.healthcare.booking.dto;

import com.healthcare.booking.entity.Specialization;

public record SpecializationDto(Long id, String name, String description) {

    public static SpecializationDto from(Specialization s) {
        return new SpecializationDto(s.getId(), s.getName(), s.getDescription());
    }
}
