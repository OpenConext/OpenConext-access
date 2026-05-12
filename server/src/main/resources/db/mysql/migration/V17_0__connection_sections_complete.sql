ALTER TABLE connections
    ADD COLUMN sections_complete INT DEFAULT 0;
ALTER TABLE applications
    ADD COLUMN sections_complete INT DEFAULT 0;
UPDATE connections SET sections_complete = 0;
UPDATE applications SET sections_complete = 0;