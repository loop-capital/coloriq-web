-- COLORiq Emergency Triage: permanent liability record of triage sessions
CREATE TABLE triage_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  salon_id UUID,
  stylist_id UUID,
  client_id UUID,
  client_name VARCHAR(200),
  risk_grade VARCHAR(20) NOT NULL,
  symptoms TEXT[] NOT NULL DEFAULT '{}',
  triage_input JSONB,
  risk_triggers TEXT[] NOT NULL DEFAULT '{}',
  recovery_plan JSONB,
  created_at TIMESTAMPTZ(6) DEFAULT now(),

  CONSTRAINT triage_sessions_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_triage_salon ON triage_sessions(salon_id);
CREATE INDEX idx_triage_salon_date ON triage_sessions(salon_id, created_at DESC);
CREATE INDEX idx_triage_grade ON triage_sessions(risk_grade);
CREATE INDEX idx_triage_client ON triage_sessions(client_id);
