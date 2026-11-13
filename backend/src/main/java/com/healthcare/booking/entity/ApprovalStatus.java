package com.healthcare.booking.entity;

/** Matches doctor_profiles.approval_status. Only APPROVED doctors are visible to patients. */
public enum ApprovalStatus {
    PENDING,
    APPROVED,
    DEACTIVATED
}
