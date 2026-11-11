-- GAP-1 consent set (Phase 1 item 4): split (a) service / (b) featuring
-- consent records, per-appointment scope, with revocation state.
-- appointment_id is an opaque scope key: the repo has no appointments
-- table, so no foreign key is declared. wording_version is the id of the
-- Gideon-cleared (b) wording version a featuring record was captured
-- against; NULL means captured against uncleared wording and can never
-- satisfy the push-time check. UNAPPLIED — review before applying.
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    appointment_id VARCHAR(100) NOT NULL,
    kind VARCHAR(20) NOT NULL,
    source VARCHAR(20) NOT NULL,
    method VARCHAR(20) NOT NULL,
    attested_by VARCHAR(255) NOT NULL,
    attested_at TIMESTAMP(6) NOT NULL,
    wording_version VARCHAR(100),
    note TEXT,
    stylist_id UUID,
    client_id UUID,
    revoked_at TIMESTAMP(6),
    revoked_by VARCHAR(255),
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_consent_records_appointment_kind ON consent_records(appointment_id, kind);
CREATE INDEX IF NOT EXISTS idx_consent_records_appointment ON consent_records(appointment_id);
