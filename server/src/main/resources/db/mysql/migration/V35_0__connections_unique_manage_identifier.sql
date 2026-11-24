-- A Manage entity can be linked to only one connection. NULLs (not yet pushed to Manage) are allowed multiple times
UPDATE connections SET manage_identifier = NULL WHERE manage_identifier = '';

ALTER TABLE connections
    ADD UNIQUE INDEX connections_protocol_manage_identifier_unique (protocol, manage_identifier);
