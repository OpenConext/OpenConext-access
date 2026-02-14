import React, {Fragment} from "react";
import I18n from "../locale/I18n";
import "./ContactPersons.scss";
import {isEmpty, stopEvent} from "../utils/Utils.js";
import InputField from "../components/InputField.jsx";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import {contactPersonTypes} from "../utils/Application.js";
import {Button, ButtonType} from "@surfnet/sds";
import {isValidEmail, isValidUrl} from "../validations/regExps.js";
import {emailPlaceholder} from "../utils/Forms.js";


export const ContactPersons = ({
                                   application,
                                   setApplication,
                                   focusedId,
                                   setFocusedId,
                                   inputRef,
                                   initial,
                                   readOnly = false
                               }) => {


    const updateContactPerson = (id, e) => {
        const contactPerson = application.contactPersons.find(person => person.id === id);
        contactPerson.email = e.target.value;
        const newApplication = {...application, contactPersons: [...application.contactPersons]};
        setApplication(newApplication);
    }

    const addContactPerson = (e, typeContact) => {
        stopEvent(e);
        const contactPerson = {
            type: typeContact,
            email: "",
            id: crypto.randomUUID()
        };
        const newContactPersons = [...application.contactPersons];
        newContactPersons.push(contactPerson);
        const newApplication = {...application, contactPersons: newContactPersons};
        setApplication(newApplication);
        setTimeout(() => setFocusedId(contactPerson.id), 500);
    };

    const removeContactPerson = contactPersonId => {
        const newContactPersons = application.contactPersons.filter(contactPerson => contactPerson.id !== contactPersonId);
        const newApplication = {...application, contactPersons: newContactPersons};
        setApplication(newApplication);
        setFocusedId(null);
    };

    const contactPersonsGrouped = Object.groupBy(application.contactPersons, contact => contact.type);
    return (
        <section className="inner-right">
            <h3>{I18n.t("connection.contacts.label")}</h3>
            <p>{I18n.t("connection.contacts.info", {
                example: emailPlaceholder("support", application?.organization?.name || application.name, I18n.t("forms.or"))
            })}</p>
            {Object.keys(contactPersonsGrouped).map((contactType, index) =>
                <section key={index} className={`contact-person-section ${readOnly ? "read-only": ""}`}>
                    <h4>{I18n.t(`connection.contacts.${contactType}`)}</h4>
                    {!isEmpty(I18n.translations[I18n.locale].connection.contacts[`${contactType}Disclaimer`]) &&
                        <p>{I18n.t(`connection.contacts.${contactType}Disclaimer`)}</p>
                    }
                    {contactPersonsGrouped[contactType].map((contactPerson, innerIndex) =>
                        <Fragment key={innerIndex}>
                            <InputField value={contactPerson.email}
                                        name={readOnly ? null : I18n.t("connection.contacts.emailOrWebsite")}
                                        placeholder={emailPlaceholder(
                                            I18n.t(`connection.contacts.${contactPerson.type}Placeholder`), application?.organization?.name || application.name,
                                            I18n.t("forms.or")
                                        )}
                                        disabled={readOnly}
                                        onChange={e => updateContactPerson(contactPerson.id, e)}
                                        onRef={el => contactPerson.id === focusedId && (inputRef.current = el)}
                                        button={(contactPerson.type === contactPersonTypes.technical && innerIndex > 0 && !readOnly) ?
                                            <Button onClick={() => removeContactPerson(contactPerson.id)}
                                                    type={ButtonType.Delete}/> : null}
                            />
                            {(!initial && isEmpty(contactPerson.email)) &&
                                <ErrorIndicator
                                    msg={I18n.t("forms.required", {name: I18n.t("connection.contacts.emailOrWebsite")})}
                                />}
                            {(!initial && !(isValidUrl(contactPerson.email) || isValidEmail(contactPerson.email))) &&
                                <ErrorIndicator
                                    msg={I18n.t("forms.invalidEmailURL", {name: contactPerson.email})}
                                />}
                            {(innerIndex === (contactPersonsGrouped[contactType].length - 1) && contactPerson.type === contactPersonTypes.technical
                                    && contactPersonsGrouped[contactType].length < 2 && !readOnly) &&
                                <a href="/add" onClick={e => addContactPerson(e, contactPersonTypes.technical)}>
                                    {I18n.t("connection.contacts.addTechnicalContact")}
                                </a>}
                        </Fragment>)
                    }
                </section>)}
        </section>
    );

}