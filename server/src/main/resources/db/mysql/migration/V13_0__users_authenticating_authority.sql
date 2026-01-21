ALTER TABLE users
    ADD COLUMN authenticating_authority varchar(255) DEFAULT NULL;