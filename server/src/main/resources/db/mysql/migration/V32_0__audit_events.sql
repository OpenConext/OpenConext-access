CREATE TABLE `audit_events`
(
    `id`              bigint       NOT NULL AUTO_INCREMENT,
    `organization_id` bigint       NOT NULL,
    `application_id`  bigint       DEFAULT NULL,
    `actor_user_id`   bigint       DEFAULT NULL,
    `actor_name`      varchar(255) DEFAULT NULL,
    `category`        varchar(32)  NOT NULL,
    `action`          varchar(64)  NOT NULL,
    `target_type`     varchar(64)  DEFAULT NULL,
    `target_id`       varchar(255) DEFAULT NULL,
    `target_name`     varchar(255) DEFAULT NULL,
    `details`         json         DEFAULT NULL,
    `created_at`      datetime(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`),
    KEY `audit_events_organization_created_at` (`organization_id`, `created_at`),
    CONSTRAINT `fk_audit_events_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_audit_events_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;
