ALTER TABLE applications
    ADD COLUMN owner_id BIGINT NULL,
    ADD CONSTRAINT fk_applications_owner
        FOREIGN KEY (owner_id)
        REFERENCES users(id)
        ON DELETE SET NULL;