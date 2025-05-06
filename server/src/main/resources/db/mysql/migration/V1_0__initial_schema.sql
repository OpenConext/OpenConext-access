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
    `organization_id`          varchar(255) DEFAULT NULL,
    `email`                    varchar(255) DEFAULT NULL,
    `created_at`               datetime     DEFAULT CURRENT_TIMESTAMP,
    `last_activity`            datetime     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `users_unique_sub` (`sub`),
    FULLTEXT KEY `full_text_index` (`given_name`, `family_name`, `email`)
) ENGINE = InnoDB
  AUTO_INCREMENT = 1
  DEFAULT CHARSET = utf8mb4;
