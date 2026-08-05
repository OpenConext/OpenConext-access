import "./ApplicationForm.scss";
import React, {useEffect, useRef, useState} from "react";
import I18n from "../locale/I18n";
import InputField from "../components/InputField.jsx";
import {useNavigate, useParams} from "react-router";
import {useAppStore} from "../stores/AppStore.js";
import {Button, ButtonType, Loader, RadioOptions, RadioOptionsOrientation, Tooltip} from "@surfnet/sds";
import InfoIcon from "@surfnet/sds/icons/functional-icons/info.svg";
import {CollapseField} from "../components/CollapseField.jsx";
import {isEmpty} from "../utils/Utils.js";
import {getApplicationById, newApplication, updateApplication} from "../api/index.js";
import {mainMenuItems} from "../utils/MenuItems.js";
import {useShallow} from "zustand/react/shallow";

export const ApplicationForm = () => {

    const {currentOrganization, setFlash} = useAppStore(useShallow(state => ({
        currentOrganization: state.currentOrganization,
        setFlash: state.setFlash
    })));

    const {applicationId} = useParams();
    const navigate = useNavigate();

    const searchRef = useRef();

    const isNew = applicationId === "new";
    const [loading, setLoading] = useState(!isNew);
    const [application, setApplication] = useState({type: "APP", target: "SURF"});
    const [checks, setChecks] = useState(() => {
        const newChecks = {};
        const translationChecks = I18n.translations[I18n.locale]["application"]["checks"];
        Object.keys(translationChecks).forEach(check => newChecks[check] = false);
        return newChecks;
    });

    useEffect(() => {
        useAppStore.setState({
            breadcrumbPaths: [
                {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                {path: `/organization/${currentOrganization.id}`, value: currentOrganization.name, menuItemName: mainMenuItems.yourApps},
                {value: I18n.t("breadCrumb.applications")}
            ]
        });
        if (!isNew) {
            getApplicationById(applicationId)
                .then(res => {
                    setApplication(res);
                    setLoading(false)
                    searchRef.current && searchRef.current.focus();
                })
        } else {
            searchRef.current && searchRef.current.focus();
        }

    }, [applicationId, currentOrganization, isNew]);

    // const targetGroupLabel = label => {
    //     const upperText = I18n.t(`application.target${label.toUpperCase()}`);
    //     const bottomText = I18n.t(`application.target${label.toUpperCase()}Info`);
    //     return `<div><p class="primary-label-radio-option">${upperText}</p><p>${bottomText}</p></div>`
    // }

    if (loading) {
        return <Loader/>
    }

    const doSaveApplication = () => {
        const promise = isNew ? newApplication : updateApplication;
        application.organization = {id: currentOrganization.id}
        promise(application)
            .then(res => {
                setFlash(I18n.t("application.flash", {name: res.name}));
                navigate(`/connection/${res.id}`)
            });
    }

    return (
        <div className="application-form-container">
            <div className="application-form">
                <h2>{I18n.t(`application.${isNew ? "new" : "edit"}`, {name: application.name})}</h2>
                <InputField name={I18n.t("application.name")}
                            value={application.name || ""}
                            required={true}
                            onRef={searchRef}
                            onChange={e => setApplication({...application, name: e.target.value})}
                            info={I18n.t("application.nameInfo")}/>
                <RadioOptions label={I18n.t("application.type")}
                              name={"type"}
                              value={application.type}
                              onChange={e => setApplication({
                                  ...application,
                                  type: e.target.id.replace("type_", "").toUpperCase()
                              })}
                              isMultiple={true}
                              labels={["APP", "CONTENT"]}
                              labelResolver={label => I18n.t(`application.${label.toLowerCase()}`)}
                              orientation={RadioOptionsOrientation.column}/>
                {application.type === "CONTENT" &&
                    <div className="sds--alert sds--alert--status-info">
                        <div className="sds--alert--inner">
                            <div className="sds--alert--visual">
                                <InfoIcon/>
                            </div>
                            <div>
                                <span>{I18n.t("application.contentInfoPre")}</span>
                                <Tooltip tip={I18n.t("application.contentInfoTip")}
                                         standalone={true}
                                         children={
                                             <span className="link">{I18n.t("application.contentInfoLink")}</span>}
                                />
                                <span>{I18n.t("application.contentInfoPost")}</span>
                            </div>
                        </div>
                    </div>
                }
                {/*<RadioOptions label={I18n.t("application.targetGroup")}*/}
                {/*              name={"target"}*/}
                {/*              value={application.target}*/}
                {/*              onChange={e => setApplication({*/}
                {/*                  ...application,*/}
                {/*                  target: e.target.id.replace("target_", "").toUpperCase()*/}
                {/*              })}*/}
                {/*              isMultiple={true}*/}
                {/*              labels={["SURF", "SRAM"]}*/}
                {/*              labelResolver={targetGroupLabel}*/}
                {/*              orientation={RadioOptionsOrientation.column}/>*/}
                {isNew &&
                    <div className="fair-use-terms">
                        <span className="label">{I18n.t("application.terms")}<sup className="required">*</sup></span>
                        {Object.keys(checks).map(check =>
                            <CollapseField title={I18n.t(`application.checks.${check}`)}
                                           name={check}
                                           key={check}
                                           disabledToggle={isEmpty(I18n.translations[I18n.locale].application.checksInfo[check])}
                                           checkRequired={e => setChecks({...checks, [check]: e.target.checked})}
                                           checkValue={checks[check]}>
                                <span>{I18n.t(`application.checksInfo.${check}`)}</span>
                            </CollapseField>)}
                    </div>}
                <section className="actions">
                    <Button onClick={() => navigate(-1)}
                            type={ButtonType.Secondary}
                            txt={I18n.t("forms.cancel")}/>
                    <Button onClick={() => doSaveApplication()}
                            txt={I18n.t("forms.submit")}
                            disabled={(isNew && Object.values(checks).some(check => !check)) || isEmpty(application.name)}/>
                </section>
            </div>
        </div>
    )
}
