CREATE TABLE `users`
(
    `id`                       bigint       NOT NULL AUTO_INCREMENT,
    `sub`                      varchar(255) NOT NULL,
    `super_user`               bool         DEFAULT 0,
    `eduperson_principal_name` varchar(255) NOT NULL,
    `given_name`               varchar(255) DEFAULT NULL,
    `family_name`              varchar(255) DEFAULT NULL,
    `name`                     varchar(255) DEFAULT NULL,
    `subject_id`               varchar(255) DEFAULT NULL,
    `eduid`                    varchar(255) DEFAULT NULL,
    `uid`                      varchar(255) DEFAULT NULL,
    `schac_home_organization`  varchar(255) DEFAULT NULL,
    `organization_guid`        varchar(255) DEFAULT NULL,
    `institution_admin`        bool         DEFAULT 0,
    `organization_id`          bigint       DEFAULT NULL,
    `email`                    varchar(255) DEFAULT NULL,
    `created_at`               datetime     DEFAULT CURRENT_TIMESTAMP,
    `last_activity`            datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `users_unique_sub` (`sub`),
    FULLTEXT KEY `full_text_index` (`given_name`, `family_name`, `email`)
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `organizations`
(
    `id`                      bigint       NOT NULL AUTO_INCREMENT,
    `name`                    varchar(255) NOT NULL,
    `schac_home_organization` varchar(255) NOT NULL,
    `created_at`              datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `organizations_unique_name` (`name`),
    FULLTEXT KEY `full_text_index` (`name`)
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;


CREATE TABLE `organization_memberships`
(
    `id`              bigint       NOT NULL AUTO_INCREMENT,
    `user_id`         bigint       NOT NULL,
    `organization_id` bigint       NOT NULL,
    `authority`       varchar(255) NOT NULL,
    `created_at`      datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `organization_memberships_unique_user_organization` (`user_id`, `organization_id`),
    CONSTRAINT `fk_organization_memberships_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_organization_memberships_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `organization_invitations`
(
    `id`                 bigint       NOT NULL AUTO_INCREMENT,
    `hash`               varchar(255) NOT NULL,
    `organization_id`    bigint       NOT NULL,
    `invitee_id`         bigint       NOT NULL,
    `intended_authority` varchar(255) NOT NULL,
    `email`              varchar(255) NOT NULL,
    `message`            varchar(255) DEFAULT NULL,
    `created_at`         datetime     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_organization_invitations_invitee` FOREIGN KEY (`invitee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_organization_invitations_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `applications`
(
    `id`              bigint       NOT NULL AUTO_INCREMENT,
    `name`            varchar(255) NOT NULL,
    `logo_url`        varchar(255) DEFAULT NULL,
    `type`            varchar(255) NOT NULL,
    `meta_data`       json         DEFAULT NULL,
    `organization_id` bigint       NOT NULL,
    `created_at`      datetime     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `applications_unique_name_organization` (`name`, `organization_id`),
    FULLTEXT KEY `full_text_index` (`name`)
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `application_memberships`
(
    `id`             bigint       NOT NULL AUTO_INCREMENT,
    `application_id` bigint       NOT NULL,
    `authority`      varchar(255) NOT NULL,
    `created_at`     datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_application_memberships_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `organization_memberships_application_memberships`
(
    `id`                         bigint NOT NULL AUTO_INCREMENT,
    `organization_membership_id` bigint NOT NULL,
    `application_membership_id`  bigint NOT NULL,
    `created_at`                 datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_cm_am_organization_membership` FOREIGN KEY (`organization_membership_id`) REFERENCES `organization_memberships` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cm_am_application_membership` FOREIGN KEY (`application_membership_id`) REFERENCES `application_memberships` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `connections`
(
    `id`                bigint       NOT NULL AUTO_INCREMENT,
    `application_id`    bigint       NOT NULL,
    `meta_data`         json     DEFAULT NULL,
    `protocol`          varchar(255) NOT NULL,
    `environment`       varchar(255) NOT NULL,
    `manage_identifier` varchar(255) NOT NULL,
    `created_at`        datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_connections_application` FOREIGN KEY (`application_id`) REFERENCES `applications` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `join_requests`
(
    `id`              bigint       NOT NULL AUTO_INCREMENT,
    `organization_id` bigint       NOT NULL,
    `user_id`         bigint       NOT NULL,
    `message`         text     DEFAULT NULL,
    `language`        varchar(255) NOT NULL,
    `created_at`      datetime DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_join_requests_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_join_requests_organization` FOREIGN KEY (`organization_id`) REFERENCES `organizations` (`id`) ON DELETE CASCADE
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;
