import "./AppInformation.scss";
import React, {Fragment, useEffect, useRef, useState} from "react";
import I18n from "../locale/I18n";
import {isEmpty, sanitize} from "../utils/Utils.js";
import {useAppStore} from "../stores/AppStore.js";
import InputField from "../components/InputField.jsx";
import {StatusMenuItem} from "../components/StatusMenuItem.jsx";
import {ImageField} from "../components/ImageField.jsx";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import {updateApplication} from "../api/index.js";
import {
    contactSectionValid,
    convertClientApplicationToServer,
    convertServerApplicationToClient,
    logoSectionValid,
    privacySectionValid
} from "../utils/Application.js";
import {ArrowRightIcon as ArrowRight} from "@phosphor-icons/react";
import {MoreLessToggle} from "../components/MoreLessToggle.jsx";
import {Button, Spinner} from "@surfnet/curve-react";
import SelectField from "../components/SelectField.jsx";
import {isValidUrl} from "../validations/regExps.js";
import ImageNotFound from "../icons/image-not-found.svg";
import {APPLICATION_STATUSES} from "../utils/Manage.js";
import {ContactPersons} from "../components/ContactPersons.jsx";

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

    const setFlash = useAppStore(state => state.setFlash);

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
        const isLogoSectionInvalid = !logoSectionValid(application);
        const isContactSectionInvalid = !contactSectionValid(application);
        const isPrivacySectionInvalid = !privacySectionValid(privacyInfo, application);
        switch (sectionName) {
            case sections.logo: {
                return isLogoSectionInvalid;
            }
            case sections.contact: {
                return isContactSectionInvalid && isLogoSectionInvalid;
            }
            case sections.privacy: {
                return isPrivacySectionInvalid && isContactSectionInvalid;
            }
        }
        return false;
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
                <h3 className="text-[length:var(--text-lg-font-size)] mb-[15px]">{I18n.t("connection.appInfo.label")}</h3>

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
                {(!initial && isEmpty(application.information.descriptionEN)) &&
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
                <h3 className="text-[length:var(--text-lg-font-size)] mb-[15px]">{I18n.t("connection.privacy.label")}</h3>
                <p>{I18n.t("connection.privacy.info")}</p>
                {privacyInfo.map((p, index) =>
                    <section key={index}>
                        {isEmpty(p.enum) &&
                            <InputField value={application.privacy[p.name] || ""}
                                        name={p[`info_${I18n.locale}`]}
                                        required={p.required}
                                        onChange={e => updatePrivacy(p.name, e.target.value)}
                                        placeholder={p[`placeholder_${I18n.locale}`]}
                                        toolTip={isEmpty(p.tooltip_en) ? null : p[`tooltip_${I18n.locale}`]}
                            />}
                        {!isEmpty(p.enum) &&
                            <SelectField
                                name={p[`info_${I18n.locale}`]}
                                required={p.required}
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
                <h3 className="text-[length:var(--text-lg-font-size)] mb-[15px]">{I18n.t("connection.appOverview.label")}</h3>
                <p>{I18n.t("connection.appOverview.info")}</p>
                <div className="application">
                    {isEmpty(application.logoUrl) ? <ImageNotFound/> :
                        <img src={application.logoUrl} alt={application.name}/>}
                    <div className="application-info">
                        <h3 className="text-[length:var(--text-lg-font-size)] mb-[15px]">{application.name}</h3>
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
                return <ContactPersons application={application}
                                       setApplication={setApplication}
                                       setFocusedId={setFocusedId}
                                       focusedId={focusedId}
                                       inputRef={inputRef}
                                       initial={initial}/>
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
        return <div className="loading-container"><Spinner className="size-8"/></div>
    }

    const submitTxt = application.status !== APPLICATION_STATUSES.OPEN ? I18n.t("connection.save") : I18n.t("connection.saveAndNext");
    return (
        <div className="app-information-container">
            <div className="app-header">
                <h2 className="text-[length:var(--text-xl-font-size)]">{I18n.t("connection.appInfo.title")}</h2>
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
                                <Button variant="secondary"
                                        onClick={backToConnections}>
                                    <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.backToOverview"))}}/>
                                </Button>
                                <Button disabled={storeAndNextDisabled()}
                                        onClick={() => storeAndNext()}>
                                    <span dangerouslySetInnerHTML={{__html: sanitize(submitTxt)}}/>
                                </Button>
                            </>
                        }
                        {section === sections.overview &&
                            <Button variant="secondary"
                                    onClick={() => backToConnections()}>
                                <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.overview"))}}/>
                                <span data-icon="inline-end"><ArrowRight/></span>
                            </Button>
                        }
                    </div>
                </section>
            </div>
        </div>
    );
}
