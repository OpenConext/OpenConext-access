import "./AppInformation.scss";
import React, {Fragment, useEffect, useRef, useState} from "react";
import I18n from "../locale/I18n";
import {isEmpty, stopEvent} from "../utils/Utils.js";
import {useAppStore} from "../stores/AppStore.js";
import InputField from "../components/InputField.jsx";
import {StatusMenuItem} from "../components/StatusMenuItem.jsx";
import {ImageField} from "../components/ImageField.jsx";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import {updateApplication} from "../api/index.js";
import {
    contactPersonTypes,
    contactSectionValid,
    convertClientApplicationToServer,
    convertServerApplicationToClient,
    logoSectionValid,
    privacySectionValid
} from "../utils/Application.js";
import ArrowRight from "@surfnet/sds/icons/functional-icons/arrow-right.svg";
import {Button, ButtonType, Loader, MoreLessToggle} from "@surfnet/sds";
import SelectField from "../components/SelectField.jsx";
import {isValidEmail, isValidUrl} from "../validations/regExps.js";
import ImageNotFound from "../icons/image-not-found.svg";
import {APPLICATION_STATUSES} from "../utils/Manage.js";
import {emailPlaceholder} from "../utils/Forms.js";

const sections = {
    logo: "logo",
    contact: "contact",
    privacy: "privacy",
    overview: "overview"
}

export const AppInformation = ({
                                   application,
                                   setApplication,
                                   refresh,
                                   privacyInfo,
                                   changeTab,
                                   protocolOptions,
                                   profileOptions,
                                   arpInfo
                               }) => {

    const {setFlash} = useAppStore(state => state);

    const [section, setSection] = useState(sections.logo);
    const [initial, setInitial] = useState(true);
    const [loading, setLoading] = useState(false);
    const [focusedId, setFocusedId] = useState(null);
    const inputRef = useRef(null);

    if (isEmpty(application.privacy.dpa_type)) {
        application.privacy.dpa_type = "dpa_supplied_by_service";
        setApplication({...application});
    }

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [focusedId]);

    const isPending = sectionName => {
        switch (sectionName) {
            case sections.logo: {
                return !logoSectionValid(application);
            }
            case sections.contact: {
                return !contactSectionValid(application);
            }
            case sections.privacy: {
                return !privacySectionValid(privacyInfo, application);
            }
        }
    }

    const isDisabled = sectionName => {
        const validCurrentSection = section === sections.logo ? logoSectionValid(application) :
            section === sections.contact ? contactSectionValid(application) : privacySectionValid(privacyInfo, application);
        const sectionIsCurrent = sectionName === section;
        return !validCurrentSection && !sectionIsCurrent
    }

    const storeAndNextDisabled = () => {
        if (initial) {
            return false;
        }
        switch (section) {
            case sections.logo: {
                return !logoSectionValid(application);
            }
            case sections.contact: {
                return !contactSectionValid(application);
            }
            case sections.privacy: {
                return !privacySectionValid(privacyInfo, application)
            }
            case sections.overview: {
                return true;
            }
        }
    }

    const storeAndNext = () => {
        setInitial(false);
        const nextSection = (section === sections.logo ? sections.contact :
            section === sections.contact ? sections.privacy : section === sections.privacy ? sections.overview : sections.overview);
        const proceed = (section === sections.logo && logoSectionValid(application)) ||
            (section === sections.contact && contactSectionValid(application)) ||
            (section === sections.privacy && privacySectionValid(privacyInfo, application));
        if (proceed) {
            setLoading(true);
            let proceedToOverview = false;
            if (section === sections.privacy && application.status === APPLICATION_STATUSES.OPEN) {
                application.status = APPLICATION_STATUSES.COMPLETE;
                proceedToOverview = true;
            }
            const body = convertClientApplicationToServer(application);
            updateApplication(body)
                .then(res => {
                    setInitial(true);
                    setLoading(false);
                    setFlash(I18n.t("application.flash", {name: res.name}));
                    setApplication(convertServerApplicationToClient(res, protocolOptions, profileOptions, arpInfo));
                    if (res.status === APPLICATION_STATUSES.OPEN || proceedToOverview) {
                        changeSection(nextSection);
                    }
                })
                .catch(() => {
                    setLoading(false);
                    setFlash(I18n.t("forms.error"), "error")
                });
        }
    };

    const backToConnections = () => {
        refresh();
        changeTab("overview");
        setSection(sections.logo);
    }

    const updateApplicationAttribute = (container, attribute, value) => {
        const newApplication = {...application, [container]: {...application[container], [attribute]: value}};
        setApplication(newApplication);
    }

    const updateApplicationLogoUrl = (value) => {
        const newApplication = {...application, logoUrl: value};
        setApplication(newApplication);
    }

    const tagOption = tag => {
        return {
            value: tag,
            label: I18n.t(`connection.appInfo.tagsAvailable.${tag}`)
        }
    };

    const tagOptions = () => {
        return Object.keys(I18n.translations[I18n.locale].connection.appInfo.tagsAvailable)
            .filter(tag => tag !== "recommended" && tag !== "surf")
            .map(tagOption);
    };

    const renderLogoSection = () => {
        return (
            <section className="inner-right">
                <h3>{I18n.t("connection.appInfo.label")}</h3>

                <ImageField imageSource={application.logoUrl || ""}
                            onChange={logo => updateApplicationLogoUrl(logo)}
                />
                {(!initial && isEmpty(application.logoUrl)) &&
                    <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("connection.appInfo.logoUrl")})}
                    />}

                <InputField value={application.information.descriptionEN || ""}
                            onChange={e => updateApplicationAttribute("information", "descriptionEN", e.target.value)}
                            name={I18n.t("connection.appInfo.descriptionEn")}
                            required={true}
                            multiline={true}
                />
                {(!initial && isEmpty(application.information.descriptionNL)) &&
                    <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("connection.appInfo.descriptionEn")})}
                    />}

                <InputField value={application.information.descriptionNL || ""}
                            onChange={e => updateApplicationAttribute("information", "descriptionNL", e.target.value)}
                            name={I18n.t("connection.appInfo.descriptionNl")}
                            required={true}
                            multiline={true}
                />
                {(!initial && isEmpty(application.information.descriptionNL)) &&
                    <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("connection.appInfo.descriptionNl")})}
                    />}

                <InputField value={application.information.webSite || ""}
                            onChange={e => updateApplicationAttribute("information", "webSite", e.target.value)}
                            name={I18n.t("connection.appInfo.webSite")}
                            required={true}
                />
                {(!initial && isEmpty(application.information.webSite)) &&
                    <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("connection.appInfo.webSite")})}
                    />}
                {(!initial && !isValidUrl(application.information.webSite)) &&
                    <ErrorIndicator msg={I18n.t("forms.invalidURL", {name: I18n.t("connection.appInfo.webSite")})}
                    />}

                <SelectField
                    name={I18n.t("connection.appInfo.tags")}
                    options={tagOptions().filter(tag => !(application.information.tags || []).includes(tag))}
                    value={(application.information.tags || []).map(tag => tagOption(tag))}
                    isMulti={true}
                    searchable={true}
                    placeholder={I18n.t("connection.appInfo.tagPlaceholder")}
                    onChange={options => options.length <= 3 && updateApplicationAttribute("information", "tags", options.map(option => option.value))}
                    info={I18n.t("connection.appInfo.tagInfo")}
                />

            </section>
        );
    }

    const changeSection = sectionName => {
        setSection(sectionName);
    }

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

    const renderContactSection = () => {
        const contactPersonsGrouped = Object.groupBy(application.contactPersons, contact => contact.type);
        return (
            <section className="inner-right">
                <h3>{I18n.t("connection.contacts.label")}</h3>
                <p>{I18n.t("connection.contacts.info", {example: emailPlaceholder("support", application.organization.name, I18n.t("forms.or"))})}</p>
                {Object.keys(contactPersonsGrouped).map((contactType, index) =>
                    <section key={index} className="contact-person-section">
                        <h4>{I18n.t(`connection.contacts.${contactType}`)}</h4>
                        {!isEmpty(I18n.translations[I18n.locale].connection.contacts[`${contactType}Disclaimer`]) &&
                            <p>{I18n.t(`connection.contacts.${contactType}Disclaimer`)}</p>
                        }
                        {contactPersonsGrouped[contactType].map((contactPerson, innerIndex) =>
                            <Fragment key={innerIndex}>
                                <InputField value={contactPerson.email}
                                            name={I18n.t("connection.contacts.emailOrWebsite")}
                                            placeholder={emailPlaceholder(
                                                I18n.t(`connection.contacts.${contactPerson.type}Placeholder`), application.organization.name,
                                                I18n.t("forms.or")
                                            )}
                                            onChange={e => updateContactPerson(contactPerson.id, e)}
                                            onRef={el => contactPerson.id === focusedId && (inputRef.current = el)}
                                            button={(contactPerson.type === contactPersonTypes.technical && innerIndex > 0) ?
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
                                        && contactPersonsGrouped[contactType].length < 2) &&
                                    <a href="/add" onClick={e => addContactPerson(e, contactPersonTypes.technical)}>
                                        {I18n.t("connection.contacts.addTechnicalContact")}
                                    </a>}
                            </Fragment>)
                        }
                    </section>)}
            </section>
        );
    };

    const updatePrivacy = (name, value) => {
        application.privacy[name] = value;
        setApplication({...application});
    }

    const enumOption = enumInstance => {
        return {
            value: enumInstance.name,
            label: enumInstance[`info_${I18n.locale}`]
        };
    }

    const renderPrivacySection = () => {
        return (
            <section className="inner-right">
                <h3>{I18n.t("connection.privacy.label")}</h3>
                <p>{I18n.t("connection.privacy.info")}</p>
                {privacyInfo.map((p, index) =>
                    <section key={index}>
                        {isEmpty(p.enum) &&
                            <InputField value={application.privacy[p.name] || ""}
                                        name={p[`info_${I18n.locale}`]}
                                        onChange={e => updatePrivacy(p.name, e.target.value)}
                                        placeholder={p[`placeholder_${I18n.locale}`]}
                                        toolTip={isEmpty(p.tooltip_en) ? null : p[`tooltip_${I18n.locale}`]}
                            />}
                        {!isEmpty(p.enum) &&
                            <SelectField
                                name={p[`info_${I18n.locale}`]}
                                options={p.enum.filter(val => val !== application.privacy[p.name]).map(val => enumOption(val))}
                                value={enumOption(p.enum.find(val => application.privacy[p.name] === val.name || val.name === p.default))}
                                onChange={option => updatePrivacy(p.name, option.value)}
                                toolTip={isEmpty(p.tooltip_en) ? null : p[`tooltip_${I18n.locale}`]}
                            />
                        }
                        {(p.required && !initial && isEmpty(application.privacy[p.name])) &&
                            <ErrorIndicator msg={I18n.t("connection.privacy.answerIsRequired")}
                            />
                        }
                        {(p.format && !initial && !isEmpty(application.privacy[p.name]) && !isValidUrl(application.privacy[p.name])) &&
                            <ErrorIndicator msg={I18n.t("forms.invalidURL", {name: p[`info_${I18n.locale}`]})}
                            />
                        }
                    </section>
                )}
            </section>
        );
    };

    const renderOverviewSection = () => {
        return (
            <section className="inner-right">
                <h3>{I18n.t("connection.appOverview.label")}</h3>
                <p>{I18n.t("connection.appOverview.info")}</p>
                <div className="application">
                    {isEmpty(application.logoUrl) ? <ImageNotFound/> :
                        <img src={application.logoUrl} alt={application.name}/>}
                    <div className="application-info">
                        <h3>{application.name}</h3>
                        <MoreLessToggle
                            txt={application.information[`description${I18n.locale.toUpperCase()}`]}
                            cutoffNumber={300}
                            moreLabel={I18n.t("forms.moreLabel")}
                            lessLabel={I18n.t("forms.lessLabel")}/>
                        <a href={application.information.webSite}
                           rel="noreferrer"
                           target="_blank">{application.information.webSite}</a>
                    </div>
                </div>
            </section>
        );
    };

    const renderSection = () => {
        switch (section) {
            case sections.logo: {
                return renderLogoSection();
            }
            case sections.contact: {
                return renderContactSection();
            }
            case sections.privacy: {
                return renderPrivacySection();
            }
            case sections.overview: {
                return renderOverviewSection();
            }
        }
    }

    if (loading) {
        return <Loader/>
    }

    const submitTxt = application.status !== APPLICATION_STATUSES.OPEN ? I18n.t("connection.save") : I18n.t("connection.saveAndNext");
    return (
        <div className="app-information-container">
            <div className="app-header">
                <h2>{I18n.t("connection.appInfo.title")}</h2>
            </div>
            <div className="app-information">
                <section className="left">
                    <div className="status-menu">
                        {Object.values(sections)
                            .filter(sectionValue => sectionValue !== sections.overview)
                            .map(sectionValue =>
                                <StatusMenuItem key={sectionValue}
                                                pending={isPending(sectionValue)}
                                                disabled={isDisabled(sectionValue)}
                                                hideIcon={application.status === APPLICATION_STATUSES.COMPLETE}
                                                action={() => changeSection(sectionValue)}
                                                info={I18n.t(`connection.appInfo.sections.${sectionValue}`)}
                                                active={section === sectionValue}/>)}
                    </div>
                </section>
                <section className="right">
                    {renderSection()}
                    <div className={`actions ${section === sections.overview ? "orphan" : ""}`}>
                        {section !== sections.overview &&
                            <>
                                <Button txt={I18n.t("forms.backToOverview")}
                                        type={ButtonType.Secondary}
                                        onClick={backToConnections}/>
                                <Button txt={submitTxt}
                                        disabled={storeAndNextDisabled()}
                                        onClick={() => storeAndNext()}/>
                            </>
                        }
                        {section === sections.overview &&
                            <Button txt={I18n.t("forms.overview")}
                                    type={ButtonType.Secondary}
                                    icon={<ArrowRight/>}
                                    onClick={() => backToConnections()}/>
                        }
                    </div>
                </section>
            </div>
        </div>
    );
}
