ALTER TABLE contracts
    ADD COLUMN provider_name    VARCHAR(255) NOT NULL,
    ADD COLUMN application_name VARCHAR(255) NOT NULL;
