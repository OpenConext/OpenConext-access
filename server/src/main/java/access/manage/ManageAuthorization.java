package access.manage;

import access.model.Environment;

public record ManageAuthorization(String url, String user, String password, Environment environment) {
}
