package access.manage;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.opensaml.core.xml.schema.XSString;
import org.opensaml.saml.saml2.metadata.ContactPerson;
import org.opensaml.saml.saml2.metadata.EmailAddress;
import org.springframework.util.CollectionUtils;

import java.util.List;

@Getter
@AllArgsConstructor
public class Contact {

    private final String type;
    private final String givenName;
    private final String surName;
    private final String email;

    public Contact(ContactPerson contactPerson) {
        this.type = contactPerson.getType() != null ? contactPerson.getType().toString() : null;
        this.givenName = getValue(contactPerson.getGivenName());
        this.surName = getValue(contactPerson.getSurName());
        List<EmailAddress> emailAddresses = contactPerson.getEmailAddresses();
        this.email = CollectionUtils.isEmpty(emailAddresses) ? null :
                emailAddresses.getFirst().getURI().replace("mailto:", "");
    }

    private String getValue(XSString xsString) {
        return xsString != null ? xsString.getValue() : null;
    }
}
