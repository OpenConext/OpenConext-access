import "./Contract.scss";
import React, {useEffect, useState} from "react";
import I18n from "../locale/I18n";
import {useAppStore} from "../stores/AppStore.js";
import {contractByOrganization, createContractForOrganization, updateContractForOrganization} from "../api/index.js";
import {Alert, AlertDescription} from "@surfnet/curve-react";
import {InfoIcon} from "@phosphor-icons/react";
import {Button, Spinner} from "@surfnet/curve-react";
import InputField from "../components/InputField.jsx";
import SelectField from "../components/SelectField.jsx";
import {countryOptions} from "../utils/countries.js";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {isEmpty, sanitize} from "../utils/Utils.js";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import {useShallow} from "zustand/react/shallow";

const KNOWN_TITLES = ["mr", "mrs", "dr", "prof"];
const OTHER_TITLE = "other";
const REQUIRED_FIELDS = ["providerName", "organizationName", "signeeName", "email"];

export const Contract = ({
                             organization,
                             user,
                             changeTab,
                         }) => {

    const {config, setFlash} = useAppStore(useShallow(state => ({
        config: state.config,
        setFlash: state.setFlash
    })));

    const [contract, setContract] = useState(null);
    const [isNew, setIsNew] = useState(true);
    const [customTitle, setCustomTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [initial, setInitial] = useState(true);
    const [jiraModal, setJiraModal] = useState({open: false, ticketKey: null});

    const isFormValid = () => contract && REQUIRED_FIELDS.every(field => !isEmpty(contract[field]));

    const signeeTitleOptions = ["mr", "mrs", "dr", "prof", OTHER_TITLE].map(k => ({
        value: k,
        label: I18n.t(`contracts.signeeTitles.${k}`),
    }));

    const defaultContract = () => ({
        signeeName: user.name || "",
        signeeTitle: "",
        email: user.email || "",
        telephone: "",
        address: "",
        country: "",
        providerName: organization.name || "",
        organizationName: organization.name || "",
    });

    useEffect(() => {
        contractByOrganization(organization.id)
            .then(res => {
                // Detect if stored signeeTitle is a known key or a custom value
                const storedTitle = res.signeeTitle || "";
                if (!KNOWN_TITLES.includes(storedTitle) && storedTitle !== "" && storedTitle !== OTHER_TITLE) {
                    setCustomTitle(storedTitle);
                    setContract({...res, signeeTitle: OTHER_TITLE});
                } else {
                    setContract(res);
                }
                setIsNew(false);
                setLoading(false);
            })
            .catch(() => {
                setContract(defaultContract());
                setIsNew(true);
                setLoading(false);
            });
    }, [organization.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const updateField = (field, value) => {
        setContract(prev => ({...prev, [field]: value}));
    };

    const doUpdate = () => {
        setInitial(false);
        if (!isFormValid()) return;
        setLoading(true);
        const resolvedTitle = contract.signeeTitle === OTHER_TITLE ? customTitle : contract.signeeTitle;
        const body = {
            ...contract,
            signeeTitle: resolvedTitle,
            // never touch signedContract here — omit it entirely for create, preserve for update
        };
        if (isNew) {
            delete body.signedContract;
        }
        const call = isNew
            ? createContractForOrganization(organization.id, body)
            : updateContractForOrganization(organization.id, body);
        call
            .then(res => {
                setLoading(false);
                if (isNew && res.ticketKey) {
                    setJiraModal({open: true, ticketKey: res.ticketKey});
                } else {
                    setFlash(I18n.t("contracts.flash.saved", {name: organization.name}));
                    changeTab("general");
                }
            })
            .catch(() => {
                setLoading(false);
                setFlash(I18n.t("forms.error"), "error");
            });
    };

    const doCancel = () => {
        changeTab("general");
    };

    if (loading || contract === null) {
        return <div className="loading-container"><Spinner className="size-8"/></div>;
    }

    const signed = !!contract.signedContract;
    const isOtherTitle = contract.signeeTitle === OTHER_TITLE;

    const selectedTitleOption = signeeTitleOptions.find(o => o.value === contract.signeeTitle) || null;
    const selectedCountryOption = countryOptions(I18n.locale).find(o => o.value === contract.country) || null;

    return (
        <div className="contract-container">
            {jiraModal.open && (
                <ConfirmationDialog
                    confirm={() => {
                        setJiraModal({open: false, ticketKey: null});
                        setFlash(I18n.t("contracts.flash.saved", {name: organization.name}));
                        changeTab("general");
                    }}
                    confirmationHeader={I18n.t("contracts.jiraModal.title")}
                    confirmationTxt={I18n.t("confirmationDialog.ok")}
                    question={I18n.t(`contracts.jiraModal.message${config.testEnvironment ? "Test" : ""}`, {jiraKey: jiraModal.ticketKey})}
                />

            )}
            <div className="contract-inner">
                <div className="app-header">
                    <h2 className="text-[length:var(--text-xl-font-size)]">{I18n.t("connection.contractSection.title")}</h2>
                </div>

                {signed && (
                    <p className="readonly-notice">{I18n.t("contracts.signedReadonly")}</p>
                )}

                {(!signed && !isNew) && (
                    <Alert>
                        <InfoIcon/>
                        <AlertDescription
                            dangerouslySetInnerHTML={{__html: sanitize(I18n.t("contracts.awaiting"))}}/>
                    </Alert>
                )}

                <div className="contract-form">
                    <InputField
                        name={I18n.t("contracts.providerName")}
                        value={contract.providerName || ""}
                        disabled={signed}
                        onChange={e => updateField("providerName", e.target.value)}
                        required={true}
                    />
                    {(!initial && isEmpty(contract.providerName)) &&
                        <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("contracts.providerName")})}/>}

                    <InputField
                        name={I18n.t("contracts.organizationName")}
                        value={contract.organizationName || ""}
                        disabled={signed}
                        onChange={e => updateField("organizationName", e.target.value)}
                        required={true}
                    />
                    {(!initial && isEmpty(contract.organizationName)) &&
                        <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("contracts.organizationName")})}/>}

                    <InputField
                        name={I18n.t("contracts.signeeName")}
                        value={contract.signeeName || ""}
                        disabled={signed}
                        onChange={e => updateField("signeeName", e.target.value)}
                        required={true}
                    />
                    {(!initial && isEmpty(contract.signeeName)) &&
                        <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("contracts.signeeName")})}/>}

                    <InputField
                        name={I18n.t("contracts.email")}
                        value={contract.email || ""}
                        disabled={signed}
                        onChange={e => updateField("email", e.target.value)}
                        required={true}
                    />
                    {(!initial && isEmpty(contract.email)) &&
                        <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("contracts.email")})}/>}

                    <SelectField
                        name={I18n.t("contracts.signeeTitle")}
                        options={signeeTitleOptions}
                        value={selectedTitleOption}
                        disabled={signed}
                        onChange={option => updateField("signeeTitle", option ? option.value : "")}
                        clearable={true}
                    />

                    {isOtherTitle && (
                        <InputField
                            name={I18n.t("contracts.signeeTitleCustom")}
                            value={customTitle}
                            disabled={signed}
                            onChange={e => setCustomTitle(e.target.value)}
                        />
                    )}

                    <InputField
                        name={I18n.t("contracts.telephone")}
                        value={contract.telephone || ""}
                        disabled={signed}
                        onChange={e => updateField("telephone", e.target.value)}
                    />

                    <InputField
                        name={I18n.t("contracts.address")}
                        value={contract.address || ""}
                        disabled={signed}
                        onChange={e => updateField("address", e.target.value)}
                    />

                    <SelectField
                        name={I18n.t("contracts.country")}
                        options={countryOptions(I18n.locale)}
                        value={selectedCountryOption}
                        disabled={signed}
                        onChange={option => updateField("country", option ? option.value : "")}
                        searchable={true}
                        clearable={true}
                    />
                </div>

                <div className="actions">
                    {!signed && (
                        <>
                            <Button variant="secondary"
                                    onClick={doCancel}>
                                <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.cancel"))}}/>
                            </Button>
                            <Button disabled={!initial && !isFormValid()}
                                    onClick={doUpdate}>
                                <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("contracts.update"))}}/>
                            </Button>
                        </>
                    )}
                    {signed && (
                        <Button variant="secondary"
                                onClick={doCancel}>
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.backToOverview"))}}/>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
