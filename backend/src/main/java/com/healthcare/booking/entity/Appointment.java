package com.healthcare.booking.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "appointments")
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // patient_id points to patient_profiles.id (not users.id)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private PatientProfile patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "slot_id", nullable = false)
    private AvailabilitySlot slot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AppointmentStatus status = AppointmentStatus.PENDING;

    @Column(length = 255)
    private String reason;

    // Set in Java (not left to the MySQL default) so the value is available right after saving.
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // updated_at and active_slot_id exist in the table but are maintained by MySQL, so they are not mapped.

    protected Appointment() {
        // required by JPA
    }

    public Appointment(PatientProfile patient, AvailabilitySlot slot, String reason) {
        this.patient = patient;
        this.slot = slot;
        this.reason = reason;
        this.status = AppointmentStatus.PENDING;
    }

    public Long getId() { return id; }
    public PatientProfile getPatient() { return patient; }
    public AvailabilitySlot getSlot() { return slot; }
    public AppointmentStatus getStatus() { return status; }
    public String getReason() { return reason; }
    public Instant getCreatedAt() { return createdAt; }

    public void setStatus(AppointmentStatus status) { this.status = status; }
}
