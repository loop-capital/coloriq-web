-- Phase 1 item 5: photo→formula pairing at capture.
-- UNAPPLIED — needs review before any migration run. Do NOT apply to
-- production or any shared database from this branch.
--
-- Gives photo_analyses a real session reference (session_id FK to
-- formulation_sessions) and a formula reference (formulation_id FK to
-- formulations, nullable: a capture may legitimately have no formula
-- context yet). photo_label is intentionally left untouched — existing
-- callers (incl. the capture UI's client-generated uids) still rely on it.
ALTER TABLE photo_analyses ADD COLUMN session_id UUID;
ALTER TABLE photo_analyses ADD COLUMN formulation_id UUID;
ALTER TABLE photo_analyses ADD CONSTRAINT photo_analyses_session_id_fkey FOREIGN KEY (session_id) REFERENCES formulation_sessions(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE photo_analyses ADD CONSTRAINT photo_analyses_formulation_id_fkey FOREIGN KEY (formulation_id) REFERENCES formulations(id) ON DELETE NO ACTION ON UPDATE NO ACTION;
CREATE INDEX idx_photo_analyses_session ON photo_analyses(session_id);
CREATE INDEX idx_photo_analyses_formulation ON photo_analyses(formulation_id);
