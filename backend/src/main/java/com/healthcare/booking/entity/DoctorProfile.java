package com.healthcare.booking.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "doctor_profiles")
public class DoctorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(length = 150)
    private String qualification;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "experience_years", nullable = false)
    private int experienceYears;

    @Column(name = "consultation_fee", nullable = false, precision = 10, scale = 2)
    private BigDecimal consultationFee = BigDecimal.ZERO;

    @Column(name = "clinic_address", length = 255)
    private String clinicAddress;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 20)
    private ApprovalStatus approvalStatus = ApprovalStatus.PENDING;

    // Owning side of the many-to-many. The join table already exists in V1__create_schema.sql.
    @ManyToMany
    @JoinTable(
            name = "doctor_specializations",
            joinColumns = @JoinColumn(name = "doctor_id"),
            inverseJoinColumns = @JoinColumn(name = "specialization_id"))
    private Set<Specialization> specializations = new LinkedHashSet<>();

    protected DoctorProfile() {
        // required by JPA
    }

    public DoctorProfile(User user, String qualification, String bio, int experienceYears,
                         BigDecimal consultationFee, String clinicAddress,
                         ApprovalStatus approvalStatus, Set<Specialization> specializations) {
        this.user = user;
        this.qualification = qualification;
        this.bio = bio;
        this.experienceYears = experienceYears;
        this.consultationFee = consultationFee;
        this.clinicAddress = clinicAddress;
        this.approvalStatus = approvalStatus;
        this.specializations = specializations;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public String getQualification() { return qualification; }
    public String getBio() { return bio; }
    public int getExperienceYears() { return experienceYears; }
    public BigDecimal getConsultationFee() { return consultationFee; }
    public String getClinicAddress() { return clinicAddress; }
    public ApprovalStatus getApprovalStatus() { return approvalStatus; }
    public Set<Specialization> getSpecializations() { return specializations; }
}
