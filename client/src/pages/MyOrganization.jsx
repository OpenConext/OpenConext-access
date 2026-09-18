import React, {useEffect, useMemo, useRef, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import {useNavigate, useParams} from "react-router";
import {
    contractByOrganization,
    createContractForOrganization,
    deleteOrganizationById,
    identityProvidersByUsedConnectionsForOrganization,
    organizationMineById,
    updateContractForOrganization,
    updateOrganizationMetaData,
    updateOrganizationName
} from "../api/index.js";
import {isEmpty, stopEvent, sanitize} from "../utils/Utils.js";
import "./MyOrganization.scss";
import I18n from "../locale/I18n";
import DOMPurify from "dompurify";
import {authorities, isOrganizationAdmin} from "../utils/Permissions.js";
import {
    Alert,
    AlertDescription,
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    Button,
    Field,
    FieldDescription,
    FieldLabel,
    Input,
    Spinner
} from "@surfnet/curve-react";
import {BuildingOfficeIcon, EnvelopeIcon, InfoIcon, TrashIcon} from "@phosphor-icons/react";
import {ContactPersons} from "../components/ContactPersons.jsx";
import {contactSectionValid, convertServerApplicationToClient} from "../utils/Application.js";
import {mainMenuItems} from "../utils/MenuItems.js";
import InputField from "../components/InputField.jsx";
import SelectField from "../components/SelectField.jsx";
import {ConnectionInUseWarning, units} from "../connection/ConnectionInUseWarning.jsx";
import {currentOrganizationFromUser} from "../utils/Organization.js";
import {countryOptions} from "../utils/countries.js";
import {StatusMenuItem} from "../components/StatusMenuItem.jsx";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import ErrorIndicator from "../components/ErrorIndicator.jsx";
import {useShallow} from "zustand/react/shallow";

const sections = {
    contactPersons: "contactPersons",
    general: "general"
}

const CONTRACT_REQUIRED_FIELDS = ["organizationName", "signeeName", "email", "telephone"];

const MyOrganization = ({refreshUser}) => {

    const {user, setFlash, config, currentOrganization} = useAppStore(useShallow(state => ({
        user: state.user,
        setFlash: state.setFlash,
        config: state.config,
        currentOrganization: state.currentOrganization
    })));

    const {organizationId} = useParams();
    const {tab} = useParams();

    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState({});
    const [externalOrganization, setExternalOrganization] = useState(true);
    const [confirmation, setConfirmation] = useState({});
    const [section, setSection] = useState(null);
    const [focusedId, setFocusedId] = useState(null);
    const [initial, setInitial] = useState(true);
    const [originalOrganizationName, setOriginalOrganizationName] = useState("");
    const [affectedIdentityProviders, setAffectedIdentityProviders] = useState([]);

    const [contract, setContract] = useState(null);
    const [isNewContract, setIsNewContract] = useState(true);
    const [contractLoading, setContractLoading] = useState(true);
    const [contractInitial, setContractInitial] = useState(true);
    const [submitConfirmation, setSubmitConfirmation] = useState(false);
    const [jiraModal, setJiraModal] = useState({open: false, ticketKey: null});

    const inputRef = useRef(null);

    const navigate = useNavigate();

    const adminUser = useMemo(() => {
        const organizationIntegerIdentifier = parseInt(organizationId, 10);
        return user.superUser || (user.organizationMemberships || [])
            .some(om => om.authority === authorities.ADMIN && om.organization.id === organizationIntegerIdentifier);
    }, [user, organizationId]);

    useEffect(() => {
        if (isEmpty(organizationId)) {
            navigate("/home");
        } else {
            organizationMineById(organizationId)
                .then(res => {
                    const convertedOrganization = convertServerApplicationToClient(res);
                    setOrganization(convertedOrganization);
                    setOriginalOrganizationName(res.name);
                    const isExternal = isEmpty(res.manageIdentifier);
                    setExternalOrganization(isExternal);
                    const currentSection = isExternal ? sections.general : (isEmpty(tab) ? sections.contactPersons : tab);
                    setSection(currentSection);
                    navigate(`/idp/${organizationId}/${currentSection}`);
                    setLoading(false);
                    const organization = currentOrganizationFromUser(user, organizationId)
                    useAppStore.setState({
                        currentOrganization: organization,
                        breadcrumbPaths: [
                            {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
                            {value: I18n.t("navigation.idp")}
                        ],
                        activeMenuItem: mainMenuItems.idp
                    });
                }).catch(() => {
                navigate("/home")
            });
        }
    }, [navigate, organizationId, user]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [focusedId]);

    const defaultContract = () => ({
        signeeName: user.name || "",
        signeeTitle: "",
        email: user.email || "",
        telephone: "",
        address: "",
        country: "",
        organizationName: organization.name || "",
    });

    const loadContract = () => {
        return contractByOrganization(organization.id)
            .then(res => {
                setContract(res);
                setIsNewContract(false);
                setContractLoading(false);
            })
            .catch(() => {
                setContract(defaultContract());
                setIsNewContract(true);
                setContractLoading(false);
            });
    };

    useEffect(() => {
        if (!externalOrganization || isEmpty(organization.id)) {
            return;
        }
        loadContract();
    }, [externalOrganization, organization.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const availableSections = useMemo(() => {
        return Object.values(sections)
            .filter(s => s !== sections.contactPersons || !externalOrganization)
    }, [externalOrganization])

    const canDeleteOrganization = externalOrganization && (user.superUser || isOrganizationAdmin(user, organization));

    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>
    }

    const doDelete = (e, confirmationRequired) => {
        stopEvent(e);
        if (confirmationRequired) {
            setLoading(true);
            //First, fetch all the possible identityProvers affected by the deletion of this organization
            identityProvidersByUsedConnectionsForOrganization(organization.id)
                .then(res => {
                    setLoading(false);
                    setAffectedIdentityProviders(res);
                    setConfirmation({
                        open: true,
                        action: () => doDelete(null, false),
                        okButton: I18n.t(isEmpty(res) ? "myOrganization.deleteButton" : "forms.deleteAnyway")
                    });
                })
        } else {
            setLoading(true);
            setAffectedIdentityProviders([]);
            deleteOrganizationById(organization.id).then(() => {
                setConfirmation({});
                useAppStore.setState({
                    currentOrganization: {name: ""}
                });
                refreshUser();
                setTimeout(() => navigate("/home"), 350);
            })
        }
    }

    const renderContactPersonsSection = () => {
        return <ContactPersons application={organization}
                               setApplication={setOrganization}
                               setFocusedId={setFocusedId}
                               focusedId={focusedId}
                               inputRef={inputRef}
                               initial={initial}
                               readOnly={!adminUser}/>
    }

    const changeKeyWords = options => {
        const newMetaData = {...organization.metaData, keyWords: (options || []).map(option => option.value)}
        setOrganization({...organization, metaData: newMetaData});
    }

    const renderInternalGeneralSection = () => {
        return (
            <section className="inner-right">
                <h3 className="text-[length:var(--text-lg-font-size)] mb-[25px]">{I18n.t("myOrganization.generalInformation")}</h3>
                <InputField name={I18n.t("myOrganization.name")}
                            value={organization.name}
                            disabled={true}/>

                <InputField name={I18n.t("myOrganization.entityID")}
                            value={organization.metaData.entityID}
                            disabled={true}/>

                <SelectField name={I18n.t("myOrganization.keyWords")}
                             value={(organization.metaData.keyWords || []).map(word => ({
                                 label: word,
                                 value: word
                             }))}
                             onChange={changeKeyWords}
                             isMulti={true}
                             disabled={!adminUser}
                             creatable={true}
                />
                <p className="info">{I18n.t("myOrganization.keyWordsInfo")}</p>
            </section>
        )
    }

    const renderCurrentSection = () => {
        switch (section) {
            case sections.contactPersons: {
                return renderContactPersonsSection();
            }
            case sections.general: {
                return renderInternalGeneralSection();
            }
            case null: {
                return null;
            }
        }
    }

    const changeTab = s => {
        navigate(`/idp/${organizationId}/${s}`);
        setSection(s);
    }

    const saveInternalOrganization = () => {
        setInitial(false);
        if (contactSectionValid(organization)) {
            setLoading(true);
            updateOrganizationMetaData(organization.id, {
                contactPersons: organization.contactPersons,
                keyWords: organization.metaData.keyWords
            })
                .then(() => {
                    refreshUser(() => setLoading(false));
                    setFlash(I18n.t("myOrganization.flash", {name: organization.name}));
                });
        }
    }

    const updateContractField = (field, value) => {
        setContract(prev => ({...prev, [field]: value}));
    }

    const isContractFormValid = () => contract && CONTRACT_REQUIRED_FIELDS.every(field => !isEmpty(contract[field]));

    const saveOrganizationNameOnly = () => {
        setLoading(true);
        updateOrganizationName(organization.id, organization.name)
            .then(() => {
                refreshUser(() => setLoading(false));
                setFlash(I18n.t("myOrganization.flash", {name: organization.name}));
            });
    }

    const doSubmitExternalOrganization = () => {
        setInitial(false);
        setContractInitial(false);
        const signed = !!contract.signedContract;
        if (isEmpty(organization.name)) {
            return;
        }
        if (!signed && !isContractFormValid()) {
            return;
        }
        if (signed) {
            saveOrganizationNameOnly();
        } else {
            setSubmitConfirmation(true);
        }
    }

    const confirmSubmitExternalOrganization = () => {
        setSubmitConfirmation(false);
        setLoading(true);
        const body = {...contract, providerName: organization.name};
        if (isNewContract) {
            delete body.signedContract;
        }
        const contractCall = isNewContract
            ? createContractForOrganization(organization.id, body)
            : updateContractForOrganization(organization.id, body);
        Promise.all([updateOrganizationName(organization.id, organization.name), contractCall])
            .then(([, contractRes]) => {
                if (isNewContract && contractRes.ticketKey) {
                    setLoading(false);
                    setJiraModal({open: true, ticketKey: contractRes.ticketKey});
                } else {
                    refreshUser(() => setLoading(false));
                    setFlash(I18n.t("myOrganization.flash", {name: organization.name}));
                }
            })
            .catch(() => {
                setLoading(false);
                setFlash(I18n.t("forms.error"), "error");
            });
    }

    const doCancelExternalOrganization = () => {
        setInitial(true);
        setContractInitial(true);
        setContractLoading(true);
        organizationMineById(organizationId).then(res => {
            setOrganization(convertServerApplicationToClient(res));
        });
        loadContract();
    }

    const renderDescribedField = (id, label, description, value, disabled, onChange, error) => (
        <div>
            <Field className="input-field">
                <FieldLabel htmlFor={id}>{label}</FieldLabel>
                <FieldDescription>{description}</FieldDescription>
                <Input id={id} className="bg-white" value={value || ""} disabled={disabled} onChange={onChange}/>
            </Field>
            {error && <ErrorIndicator msg={error}/>}
        </div>
    );

    const renderExternalOrganizationSettings = () => {
        if (contractLoading || contract === null) {
            return <div className="loading-container"><Spinner className="size-8"/></div>;
        }
        const signed = !!contract.signedContract;
        return (
            <div className="external-organization-settings">
                <section>
                    <h3 className="text-[length:var(--text-xl-font-size)]">{I18n.t("myOrganization.generalSectionTitle")}</h3>
                    {renderDescribedField(
                        "organization-name",
                        I18n.t("myOrganization.nameLabel"),
                        I18n.t("myOrganization.nameDescription"),
                        organization.name,
                        !adminUser,
                        e => setOrganization({...organization, name: e.target.value}),
                        (!initial && isEmpty(organization.name)) ? I18n.t("forms.required", {name: I18n.t("myOrganization.nameLabel")}) : null
                    )}
                </section>
                {isOrganizationAdmin(user, currentOrganization) &&
                <section>
                    <h3 className="text-[length:var(--text-xl-font-size)]">{I18n.t("myOrganization.contractSectionTitle")}</h3>

                    {signed &&
                        <p className="readonly-notice">{I18n.t("contracts.signedReadonly")}</p>}
                    {(!signed && !isNewContract) &&
                        <Alert variant={"info"}>
                            <InfoIcon/>
                            <AlertDescription
                                dangerouslySetInnerHTML={{__html: sanitize(I18n.t("contracts.awaiting"))}}/>
                        </Alert>}

                    {renderDescribedField(
                        "contract-organization-name",
                        I18n.t("contracts.organizationName"),
                        I18n.t("contracts.organizationNameDescription"),
                        contract.organizationName,
                        signed,
                        e => updateContractField("organizationName", e.target.value),
                        (!contractInitial && isEmpty(contract.organizationName)) ? I18n.t("forms.required", {name: I18n.t("contracts.organizationName")}) : null
                    )}

                    <div className="field-row">
                        <InputField name={I18n.t("contracts.signeeTitle")}
                                    value={contract.signeeTitle}
                                    disabled={signed}
                                    optional={true}
                                    onChange={e => updateContractField("signeeTitle", e.target.value)}/>
                        <InputField name={I18n.t("contracts.signeeName")}
                                    value={contract.signeeName}
                                    disabled={signed}
                                    onChange={e => updateContractField("signeeName", e.target.value)}/>
                    </div>
                    {(!contractInitial && isEmpty(contract.signeeName)) &&
                        <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("contracts.signeeName")})}/>}

                    <InputField name={I18n.t("contracts.email")}
                                value={contract.email}
                                disabled={signed}
                                onChange={e => updateContractField("email", e.target.value)}/>
                    {(!contractInitial && isEmpty(contract.email)) &&
                        <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("contracts.email")})}/>}

                    <InputField name={I18n.t("contracts.telephone")}
                                value={contract.telephone}
                                disabled={signed}
                                onChange={e => updateContractField("telephone", e.target.value)}/>
                    {(!contractInitial && isEmpty(contract.telephone)) &&
                        <ErrorIndicator msg={I18n.t("forms.required", {name: I18n.t("contracts.telephone")})}/>}

                    <InputField name={I18n.t("contracts.address")}
                                value={contract.address}
                                disabled={signed}
                                optional={true}
                                onChange={e => updateContractField("address", e.target.value)}/>

                    <SelectField name={I18n.t("contracts.country")}
                                 options={countryOptions(I18n.locale)}
                                 value={countryOptions(I18n.locale).find(o => o.value === contract.country) || null}
                                 disabled={signed}
                                 optional={true}
                                 onChange={option => updateContractField("country", option ? option.value : "")}
                                 searchable={true}
                                 clearable={true}/>
                </section>}

                <div className="form-actions">
                    <Button variant="outline" onClick={doCancelExternalOrganization}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.cancel"))}}/>
                    </Button>
                    <Button onClick={doSubmitExternalOrganization}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("myOrganization.proceedButton"))}}/>
                    </Button>
                </div>
            </div>
        );
    }

    const {open, action, okButton} = confirmation;
    return (
        <div
            className="my-organization-outer-container">
            <AlertDialog open={!!open} onOpenChange={isOpen => !isOpen && setConfirmation({open: false})}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-danger-subtle text-danger-subtle-foreground">
                            <BuildingOfficeIcon/>
                        </AlertDialogMedia>
                        <AlertDialogTitle>{I18n.t("myOrganization.deleteConfirmationTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("myOrganization.deleteWarning"))}}/>
                            {!isEmpty(affectedIdentityProviders) &&
                                <ConnectionInUseWarning identityProviders={affectedIdentityProviders}
                                                        unit={units.organization}
                                                        applicationName="N/A"/>}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.cancel"))}}/>
                        </AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={action}>
                            <span dangerouslySetInnerHTML={{__html: sanitize(okButton)}}/>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <AlertDialog open={submitConfirmation} onOpenChange={isOpen => !isOpen && setSubmitConfirmation(false)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogMedia>
                            <EnvelopeIcon/>
                        </AlertDialogMedia>
                        <AlertDialogTitle>{I18n.t("contracts.submitConfirmation.title")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {I18n.t("contracts.submitConfirmation.message")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.back"))}}/>
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmSubmitExternalOrganization}>
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("contracts.submitConfirmation.confirm"))}}/>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            {jiraModal.open &&
                <ConfirmationDialog
                    confirm={() => {
                        setJiraModal({open: false, ticketKey: null});
                        setFlash(I18n.t("contracts.flash.saved", {name: organization.name}));
                        setIsNewContract(false);
                        refreshUser();
                    }}
                    confirmationHeader={I18n.t("contracts.jiraModal.title")}
                    confirmationTxt={I18n.t("confirmationDialog.ok")}
                    question={I18n.t(`contracts.jiraModal.message${config.testEnvironment ? "Test" : ""}`, {jiraKey: jiraModal.ticketKey})}
                />}
            <div className="my-organization-header-container">
                <div className="top-header">
                    <h1 className="text-[length:var(--text-2xl-font-size)]">{I18n.t("myOrganization.title")}</h1>
                    {canDeleteOrganization &&
                        <Button variant="ghost" onClick={e => doDelete(e, true)}>
                            <TrashIcon/>
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.delete"))}}/>
                        </Button>}
                </div>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("myOrganization.info"),
                        {ADD_ATTR: ['target'], ADD_TAGS: ['rel']})}}/>
            </div>
            <div className="my-organization">
                {externalOrganization ? renderExternalOrganizationSettings() : (
                    <>
                        <h1 className="text-[length:var(--text-2xl-font-size)]">{I18n.t("myOrganization.maintenance", {name: originalOrganizationName})}</h1>
                        <div className="menu-container">
                            <div className="left-menu">
                                {availableSections
                                    .map((s, index) =>
                                        <StatusMenuItem key={index}
                                                        hideIcon={true}
                                                        active={s === section}
                                                        action={() => changeTab(s)}
                                                        info={I18n.t(`myOrganization.${s}`)}/>
                                    )}
                            </div>
                            <div className="right-menu">
                                {renderCurrentSection()}
                            </div>
                        </div>
                        {adminUser &&
                            <div className="actions proceed">
                                <Button onClick={saveInternalOrganization}
                                        disabled={!initial && !contactSectionValid(organization) && isEmpty(organization.name)}
                                >
                                    <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("myOrganization.proceedButton"))}}/>
                                </Button>
                            </div>}
                    </>
                )}
            </div>
        </div>

    )

};
export default MyOrganization;
