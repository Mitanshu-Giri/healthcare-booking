-- V1: full schema (8 tables). Phase 3 code uses users, patient_profiles, specializations.
-- The other tables are created now so later phases need no schema surgery.

CREATE TABLE users (
    id                    BIGINT       NOT NULL AUTO_INCREMENT,
    email                 VARCHAR(150) NOT NULL,
    password_hash         VARCHAR(100) NOT NULL,
    full_name             VARCHAR(100) NOT NULL,
    phone                 VARCHAR(20)  NULL,
    role                  VARCHAR(20)  NOT NULL,            -- PATIENT | DOCTOR | ADMIN
    enabled               BOOLEAN      NOT NULL DEFAULT TRUE,
    failed_login_attempts INT          NOT NULL DEFAULT 0,
    locked_until          TIMESTAMP    NULL,
    created_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE patient_profiles (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    user_id       BIGINT       NOT NULL,
    date_of_birth DATE         NULL,
    gender        VARCHAR(20)  NULL,
    blood_group   VARCHAR(5)   NULL,
    address       VARCHAR(255) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_patient_user UNIQUE (user_id),
    CONSTRAINT fk_patient_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE specializations (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_specialization_name UNIQUE (name)
);

CREATE TABLE doctor_profiles (
    id               BIGINT        NOT NULL AUTO_INCREMENT,
    user_id          BIGINT        NOT NULL,
    qualification    VARCHAR(150)  NULL,
    bio              TEXT          NULL,
    experience_years INT           NOT NULL DEFAULT 0,
    consultation_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    clinic_address   VARCHAR(255)  NULL,
    approval_status  VARCHAR(20)   NOT NULL DEFAULT 'PENDING',  -- PENDING | APPROVED | DEACTIVATED
    PRIMARY KEY (id),
    CONSTRAINT uq_doctor_user UNIQUE (user_id),
    CONSTRAINT fk_doctor_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE doctor_specializations (
    doctor_id         BIGINT NOT NULL,
    specialization_id BIGINT NOT NULL,
    PRIMARY KEY (doctor_id, specialization_id),
    CONSTRAINT fk_ds_doctor FOREIGN KEY (doctor_id) REFERENCES doctor_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_ds_spec   FOREIGN KEY (specialization_id) REFERENCES specializations (id) ON DELETE CASCADE
);

CREATE TABLE availability_slots (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    doctor_id  BIGINT      NOT NULL,
    slot_date  DATE        NOT NULL,
    start_time TIME        NOT NULL,
    end_time   TIME        NOT NULL,
    status     VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',        -- AVAILABLE | BOOKED
    PRIMARY KEY (id),
    -- a doctor can never have two slots at the same date/time
    CONSTRAINT uq_slot_doctor_time UNIQUE (doctor_id, slot_date, start_time),
    CONSTRAINT fk_slot_doctor FOREIGN KEY (doctor_id) REFERENCES doctor_profiles (id) ON DELETE CASCADE,
    INDEX idx_slot_date_status (slot_date, status)
);

CREATE TABLE appointments (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    patient_id BIGINT       NOT NULL,                           -- patient_profiles.id
    slot_id    BIGINT       NOT NULL,
    status     VARCHAR(20)  NOT NULL DEFAULT 'PENDING',         -- PENDING | CONFIRMED | REJECTED | CANCELLED | COMPLETED
    reason     VARCHAR(255) NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES patient_profiles (id) ON DELETE CASCADE,
    CONSTRAINT fk_appt_slot    FOREIGN KEY (slot_id) REFERENCES availability_slots (id) ON DELETE CASCADE,
    INDEX idx_appt_patient (patient_id, status),
    INDEX idx_appt_slot (slot_id, status)
);

CREATE TABLE refresh_tokens (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    user_id    BIGINT      NOT NULL,
    token_hash CHAR(64)    NOT NULL,                            -- SHA-256 of the token, never the token itself
    expires_at TIMESTAMP   NOT NULL,
    revoked    BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT uq_refresh_hash UNIQUE (token_hash),
    CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
