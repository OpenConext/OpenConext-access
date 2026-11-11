ALTER TABLE `audit_events`
    ADD COLUMN `change_request_id` varchar(64) DEFAULT NULL,
    ADD COLUMN `status`            varchar(16) DEFAULT NULL,
    ADD COLUMN `request_type`      varchar(64) DEFAULT NULL,
    ADD COLUMN `meta_data_id`      varchar(64) DEFAULT NULL,
    ADD COLUMN `entity_type`       varchar(32) DEFAULT NULL,
    ADD COLUMN `resolved_at`       datetime(3) DEFAULT NULL,
    ADD KEY `audit_events_organization_status` (`organization_id`, `status`);
