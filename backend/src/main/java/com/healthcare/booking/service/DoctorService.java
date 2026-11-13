package com.healthcare.booking.service;

import com.healthcare.booking.dto.DoctorDto;
import com.healthcare.booking.entity.ApprovalStatus;
import com.healthcare.booking.entity.DoctorProfile;
import com.healthcare.booking.exception.ApiException;
import com.healthcare.booking.repository.DoctorProfileRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

@Service
public class DoctorService {

    private static final int MAX_SEARCH_LENGTH = 100;

    private final DoctorProfileRepository doctorRepository;

    public DoctorService(DoctorProfileRepository doctorRepository) {
        this.doctorRepository = doctorRepository;
    }

    /** Active doctors only, optionally filtered by specialization id and/or part of the name. */
    @Transactional(readOnly = true)
    public List<DoctorDto> listActive(Long specializationId, String search) {
        String term = normalizeSearch(search);

        List<DoctorProfile> doctors = (specializationId == null)
                ? doctorRepository.findActive(ApprovalStatus.APPROVED, term)
                : doctorRepository.findActiveBySpecialization(ApprovalStatus.APPROVED, term, specializationId);

        return doctors.stream().map(DoctorDto::from).toList();
    }

    /**
     * A missing doctor and a deactivated/pending doctor both return 404 on purpose,
     * so the API does not reveal which ids exist but are hidden.
     */
    @Transactional(readOnly = true)
    public DoctorDto getActiveById(Long id) {
        return doctorRepository.findActiveById(id, ApprovalStatus.APPROVED)
                .map(DoctorDto::from)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Doctor not found"));
    }

    private String normalizeSearch(String search) {
        if (search == null) {
            return "";
        }
        String term = search.trim().toLowerCase(Locale.ROOT);
        return term.length() > MAX_SEARCH_LENGTH ? term.substring(0, MAX_SEARCH_LENGTH) : term;
    }
}
