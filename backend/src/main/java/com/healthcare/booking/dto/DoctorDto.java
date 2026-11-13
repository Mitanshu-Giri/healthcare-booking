package com.healthcare.booking.dto;

import com.healthcare.booking.entity.DoctorProfile;
import com.healthcare.booking.entity.Specialization;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;

/**
 * Public view of a doctor. Deliberately has no email, phone or account fields:
 * anyone (even logged-out visitors) can read this.
 */
public record DoctorDto(
        Long id,
        String fullName,
        String qualification,
        String bio,
        int experienceYears,
        BigDecimal consultationFee,
        String clinicAddress,
        List<SpecializationDto> specializations
) {
    public static DoctorDto from(DoctorProfile d) {
        List<SpecializationDto> specs = d.getSpecializations().stream()
                .sorted(Comparator.comparing(Specialization::getName))
                .map(SpecializationDto::from)
                .toList();
        return new DoctorDto(
                d.getId(),
                d.getUser().getFullName(),
                d.getQualification(),
                d.getBio(),
                d.getExperienceYears(),
                d.getConsultationFee(),
                d.getClinicAddress(),
                specs);
    }
}
