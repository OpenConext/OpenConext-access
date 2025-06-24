import "./AppInformation.scss";
import React, {useState} from "react";
import I18n from "../locale/I18n";
import {isEmpty} from "../utils/Utils.js";
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
import ArrowRight from "@surfnet/sds/icons/functional-icons/arrow-right.svg";
import {Button, ButtonType} from "@surfnet/sds";
import SelectField from "../components/SelectField.jsx";
import {isValidUrl, validUrlRegExp} from "../validations/regExps.js";

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
                                   privacyInfo
                               }) => {

    const {setFlash} = useAppStore(state => state);

    const [section, setSection] = useState(sections.logo);
    const [finishedSections, setFinishedSections] = useState([]);
    const [initial, setInitial] = useState(true);
    const [loading, setLoading] = useState(false);

    const isPending = sectionName => {
        const finished = finishedSections.includes(sectionName);
        switch (sectionName) {
            case sections.logo: {
                return !logoSectionValid();
            }
            case sections.contact: {
                return !finished || !contactSectionValid();
            }
            case sections.privacy: {
                return !finished || !privacySectionValid();
            }
        }
    }

    const isDisabled = sectionName => {
        const validCurrentSection = section === sections.logo ? logoSectionValid() :
            section === sections.contact ? contactSectionValid() : privacySectionValid();
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
        }
    }

    const storeAndNext = () => {
        setInitial(false);
        const nextSection = section === sections.logo ? sections.contact :
            section === sections.logo ? sections.privacy : section === section.privacy ? section.overview : section;
        const proceed = (section === sections.logo && logoSectionValid(application)) ||
            (section === sections.contact && contactSectionValid(application)) ||
            (section === sections.privacy && privacySectionValid(privacyInfo, application));
        if (proceed) {
            setLoading(true);
            const body = convertClientApplicationToServer(application);
            updateApplication(body)
                .then(res => {
                    setFinishedSections([...finishedSections, section]);
                    setLoading(false);
                    setFlash(I18n.t("application.flash", {name: res.name}));
                    setApplication(convertServerApplicationToClient(res));
                    changeSection(nextSection);
                })
                .catch(() => {
                    setLoading(false);
                    setFlash(I18n.t("forms.error"), "error")
                });

        }
    };

    const backToConnections = () => {
        refresh();
        setSection(sections.logo);
    }

    const updateApplicationAttribute = (container, attribute, value) => {
        const newApplication = {...application, [container]: {...application[container], [attribute]: value}};
        setApplication(newApplication);
    }

    const tagOption = tag => {
        return {
            value: tag,
            label: I18n.t(`connection.appInfo.tagsAvailable.${tag}`)
        }
    };

    const tagOptions = () => {
        return Object.keys(I18n.translations[I18n.locale].connection.appInfo.tagsAvailable).map(tagOption);
    };

    const renderLogoSection = () => {
        return (
            <section className="inner-right">
                <h3>{I18n.t("connection.appInfo.label")}</h3>

                <ImageField imageSource={application.information.logoUrl || ""}
                            onChange={logoUrl => updateApplicationAttribute("information", "logoUrl", logoUrl)}
                />
                {(!initial && isEmpty(application.information.logoUrl)) &&
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
                    onChange={options => updateApplicationAttribute("information", "tags", options.map(option => option.value))}
                    info={I18n.t("connection.appInfo.tagInfo")}
                />


            </section>
        );
    }

    const changeSection = sectionName => {
        setSection(sectionName);
    }

    const renderContactSection = () => {
        return (
            <span>TODO</span>
        );
    };

    const renderPrivacySection = () => {
        return (
            <span>TODO</span>
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
        }
    }

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
                                <Button txt={I18n.t("connection.saveAndNext")}
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
