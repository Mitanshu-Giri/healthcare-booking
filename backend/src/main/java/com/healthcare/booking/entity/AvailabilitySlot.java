package com.healthcare.booking.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "availability_slots")
public class AvailabilitySlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // doctor_id points to doctor_profiles.id (not users.id)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private DoctorProfile doctor;

    @Column(name = "slot_date", nullable = false)
    private LocalDate slotDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SlotStatus status = SlotStatus.AVAILABLE;

    protected AvailabilitySlot() {
        // required by JPA
    }

    public AvailabilitySlot(DoctorProfile doctor, LocalDate slotDate, LocalTime startTime, LocalTime endTime) {
        this.doctor = doctor;
        this.slotDate = slotDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = SlotStatus.AVAILABLE;
    }

    public void reschedule(LocalDate slotDate, LocalTime startTime, LocalTime endTime) {
        this.slotDate = slotDate;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    public void markBooked() { this.status = SlotStatus.BOOKED; }

    public void markAvailable() { this.status = SlotStatus.AVAILABLE; }

    public Long getId() { return id; }
    public DoctorProfile getDoctor() { return doctor; }
    public LocalDate getSlotDate() { return slotDate; }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }
    public SlotStatus getStatus() { return status; }
}
