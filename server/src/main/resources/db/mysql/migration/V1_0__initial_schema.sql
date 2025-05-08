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

CREATE TABLE `applications`
(
    `id`              bigint NOT NULL AUTO_INCREMENT,
    `name`            varchar(255) DEFAULT NULL,
    `meta_data`       json         DEFAULT NULL,
    `organization_id` bigint NOT NULL,
    `created_at`      datetime     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `applications_unique_name_organization` (`name`, `organization_id`),
    FULLTEXT KEY `full_text_index` (`name`)
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;
