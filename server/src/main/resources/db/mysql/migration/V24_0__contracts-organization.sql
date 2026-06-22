ALTER TABLE contracts
    ADD COLUMN organization_id BIGINT NULL,
    ADD CONSTRAINT fk_contracts_organization FOREIGN KEY (organization_id) REFERENCES organizations (id) ON DELETE CASCADE;

ALTER TABLE contracts
    DROP FOREIGN KEY fk_contracts_application,
    DROP COLUMN application_id;
