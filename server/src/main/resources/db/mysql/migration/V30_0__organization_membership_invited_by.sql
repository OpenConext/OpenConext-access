ALTER TABLE organization_memberships
    ADD COLUMN invited_by_id bigint NULL,
    ADD CONSTRAINT `fk_organization_memberships_invited_by` FOREIGN KEY (`invited_by_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;
