import "./ApplicationForm.scss";
import React, {useEffect, useRef, useState} from "react";
import I18n from "../locale/I18n";
import InputField from "../components/InputField.jsx";
import {useNavigate, useParams} from "react-router";
import {useAppStore} from "../stores/AppStore.js";
import {
    Button,
    Checkbox,
    RadioGroup,
    RadioGroupItem,
    Spinner,
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from "@surfnet/curve-react";
import {isEmpty, sanitize} from "../utils/Utils.js";
import {applicationNameExists, getApplicationById, newApplication, updateApplication} from "../api/index.js";
import {mainMenuItems} from "../utils/MenuItems.js";
import {useShallow} from "zustand/react/shallow";
import ErrorIndicator from "../components/ErrorIndicator.jsx";

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
    const [originalName, setOriginalName] = useState();
    const [duplicateApplicationName, setDuplicateApplicationName] = useState(false);

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
                    setOriginalName(res.name);
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
        return <div className="loading-container"><Spinner className="size-8"/></div>
    }

    const validateApplicationName = e => {
        const name = e.target.value.trim();
        if (!isEmpty(name) && name !== originalName) {
            applicationNameExists(name, currentOrganization.id, isNew ? null : application.id)
                .then(exists => setDuplicateApplicationName(exists));
        } else {
            setDuplicateApplicationName(false);
        }
    };

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
                <h2 className="text-[length:var(--text-xl-font-size)]">{I18n.t(`application.${isNew ? "new" : "edit"}`, {name: application.name})}</h2>
                <InputField name={I18n.t("application.name")}
                            value={application.name || ""}
                            required={true}
                            onRef={searchRef}
                            onBlur={validateApplicationName}
                            error={duplicateApplicationName}
                            onChange={e => {
                                setApplication({...application, name: e.target.value});
                                setDuplicateApplicationName(false);
                            }}
                            info={I18n.t("application.nameInfo")}/>
                {duplicateApplicationName &&
                    <ErrorIndicator adjustMargin={true}
                                    msg={I18n.t("application.duplicateName", {name: application.name})}/>}

                <div className="application-type">
                    <p>{I18n.t("application.type")}</p>
                    <RadioGroup value={application.type}
                                onValueChange={type => setApplication({...application, type})}
                                className="radio-options-group column">
                        <div className="radio-item">
                            <RadioGroupItem value="APP" id="application-type-app"/>
                            <label htmlFor="application-type-app">{I18n.t("application.typeApp")}</label>
                        </div>
                        <div className="radio-item">
                            <RadioGroupItem value="CONTENT" id="application-type-content"/>
                            <label htmlFor="application-type-content">{I18n.t("application.typeContent")}</label>
                        </div>
                    </RadioGroup>

                    <div className={"info"}>
                        <span>{I18n.t("application.contentInfoPre")}</span>
                        <Tooltip>
                            <TooltipTrigger render={<span className="link">{I18n.t("application.contentInfoLink")}</span>}/>
                            <TooltipContent className="content-info-tip"><span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("application.contentInfoTip"))}}/></TooltipContent>
                        </Tooltip>
                        <span>{I18n.t("application.contentInfoPost")}</span>
                    </div>
                </div>
                <section className="actions">
                    <Button onClick={() => navigate(-1)}
                            variant="outline">
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.cancel"))}}/>
                    </Button>
                    <Button onClick={() => doSaveApplication()}
                            disabled={isNew  || isEmpty(application.name) || duplicateApplicationName}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.submit"))}}/>
                    </Button>
                </section>
            </div>
        </div>
    )
}
