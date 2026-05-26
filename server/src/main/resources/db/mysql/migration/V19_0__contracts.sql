CREATE TABLE contracts
(
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    signee_name    VARCHAR(255) NOT NULL,
    signee_title   VARCHAR(255),
    address        VARCHAR(255),
    country        VARCHAR(255),
    telephone      VARCHAR(255),
    email          VARCHAR(255) NOT NULL,
    signed_contract tinyint(1)   DEFAULT 0,
    application_id BIGINT       NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_contracts_application FOREIGN KEY (application_id) REFERENCES applications (id) ON DELETE CASCADE
);
