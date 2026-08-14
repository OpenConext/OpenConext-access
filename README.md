# OpenConext-Access

[![Build Status](https://github.com/OpenConext/OpenConext-Access/actions/workflows/actions.yml/badge.svg)](https://github.com/SOpenConext/OpenConext-Access/actions/workflows/actions.yml/badge.svg)
![Coverage](.github/badges/jacoco.svg)

[Coverage report](https://openconext.github.io/OpenConext-access)


## [Getting started](#getting-started)

### [System Requirements](#system-requirements)

- Java 21
- Maven 3
- Node (nvm)
- Yarn
- Mailpit
- Mariadb / MySql

First install Java 21 with a package manager
and then export the correct the `JAVA_HOME`. For example, on macOS:

```bash
export JAVA_HOME=/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home/
```

### [Building and running](#building-and-running)

### Database and Maipit

The `docker-compose.yaml` file in this project is meant for local development and contains a MariaDB and Mailpit instance

or run `docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"`

```shell
docker compose up -d
```

Then create the MySQL database:

```sql
DROP DATABASE IF EXISTS access;
CREATE DATABASE access CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'access'@'%' IDENTIFIED BY 'secret';
GRANT ALL privileges ON `access`.* TO 'access'@'%';
```

Note: in case of an error about COLLATE, omit `COLLATE utf8mb4_0900_ai_ci` from script above

### Access Server

The access server uses Spring Boot and Maven. To run locally, type:

```bash
cd server
mvn spring-boot:run
```

### Access Client

The access client uses ReactJS. To run locally, type:

```bash
cd client
nvm use
yarn install
yarn dev
```

### [Mail](#mail)

In the default `application.properties` the mail host is `localhost` and the port is `1025`. Run mailpit to capture mails.
See <https://github.com/axllent/mailpit>

### [Local endpoints](#local-endpoints)

Login with Mujina IdP and user `admin` to become superuser in the local environment.

To become an institution admin in access, add the following values as `urn:mace:surf.nl:attribute-def:surf-autorisaties` using Mujina:

- urn:mace:surfnet.nl:surfnet.nl:sab:organizationGUID:ad93daef-0911-e511-80d0-005056956c1a
- urn:mace:surfnet.nl:surfnet.nl:sab:role:SURFconextverantwoordelijke

### [Add attribute](#add-attribute)

If the GUI for maintaining a connection, needs any additional attributes, then the following source files need to be
altered:

- `access.manage.ConnectionProviderConverter.java#convert`
- `access.model.Connection.java#mergeMetaData`
- `utils/Connection.js#convertClientConnectionToServer`


### [Upgrade](#upgrade)

To check the pom.xml with the latest versions, run 
```
cd server
mvn versions:display-dependency-updates -DprocessDependencyManagement=false -DdependencyIncludes=*:*
```
To see the latest versions report for the client run
```
cd client
nvm use
yarn outdated
```

### [Designs](#design)

https://www.figma.com/design/81StIVqfOKfwhWVjx7Ew81/SURF-Access?node-id=1916-18441&t=gmckiSapuONmLn5u-4

### [Minio](#minio)

```
exec -it minio bash
mc alias set local http://localhost:9000 minioadmin minioadmin
mc ls local
mc rb --force --dangerous local/s3-images
```
