import React, {useEffect, useMemo, useRef, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import {useNavigate, useParams} from "react-router";
import {
    deleteOrganizationById,
    identityProvidersByUsedConnectionsForOrganization,
    organizationMineById,
    updateOrganizationMetaData,
    updateOrganizationName
} from "../api/index.js";
import {isEmpty, stopEvent, sanitize} from "../utils/Utils.js";
import "./MyOrganization.scss";
import I18n from "../locale/I18n";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import DOMPurify from "dompurify";
import {authorities, isOrganizationAdmin} from "../utils/Permissions.js";
import {Button, Spinner} from "@surfnet/curve-react";
import {ContactPersons} from "../components/ContactPersons.jsx";
import {contactSectionValid, convertServerApplicationToClient} from "../utils/Application.js";
import {mainMenuItems} from "../utils/MenuItems.js";
import InputField from "../components/InputField.jsx";
import SelectField from "../components/SelectField.jsx";
import {ConnectionInUseWarning, units} from "../connection/ConnectionInUseWarning.jsx";
import {currentOrganizationFromUser} from "../utils/Organization.js";
import {Contract} from "../connection/Contract.jsx";

const sections = {
    contactPersons: "contactPersons",
    general: "general",
    contract: "contract",
    delete: "delete"
}

const MyOrganization = ({refreshUser}) => {
    const user = useAppStore(state => state.user);
    const setFlash = useAppStore(state => state.setFlash);

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
                    setExternalOrganization(isEmpty(res.manageIdentifier));
                    const currentSection = isEmpty(tab) ? (isEmpty(res.manageIdentifier) ? sections.general : sections.contactPersons) : tab;
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

    const availableSections = useMemo(() => {
        return Object.values(sections)
            .filter(s => s !== sections.delete || (externalOrganization && (user.superUser || isOrganizationAdmin(user, organization))))
            .filter(s => s !== sections.contactPersons || !externalOrganization)
            .filter(s => s !== sections.contract || (externalOrganization && adminUser))
    }, [externalOrganization, organization, user, adminUser])

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
                        cancel: () => setConfirmation({open: false}),
                        action: () => doDelete(null, false),
                        question: I18n.t("organization.deleteConfirmation", {name: organization.name}),
                        okButton: I18n.t(isEmpty(res) ? "forms.delete" : "forms.deleteAnyway")
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

    const renderExternalGeneralSection = () => {
        return (
            <section className="inner-right">
                <h3 className="text-[length:var(--text-lg-font-size)] mb-[25px]">{I18n.t("myOrganization.generalInformation")}</h3>
                <InputField name={I18n.t("myOrganization.name")}
                            value={organization.name}
                            disabled={!adminUser}
                            onChange={e => setOrganization({...organization, name: e.target.value})}/>
            </section>
        )
    }

    const renderContractSection = () => {
        return <Contract organization={organization} user={user} changeTab={changeTab}/>;
    }

    const renderDeleteSection = () => {
        return (
            <div>
                <h3 className="text-[length:var(--text-lg-font-size)] mb-[25px]">{I18n.t(`myOrganization.${sections.delete}`)}</h3>
                <p>{I18n.t("myOrganization.deleteWarning")}</p>
                <div className="actions">
                    <Button onClick={e => doDelete(e, true)}
                            variant="destructive"
                    >
                        <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("myOrganization.deleteButton"))}}/>
                    </Button>
                </div>
            </div>
        );
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

    const saveExternalOrganization = () => {
        setInitial(false);
        if (!isEmpty(organization.name)) {
            setLoading(true);
            updateOrganizationName(organization.id, organization.name)
                .then(() => {
                    refreshUser(() => setLoading(false));
                    setFlash(I18n.t("myOrganization.flash", {name: organization.name}));
                });
        }
    }

    const renderCurrentSection = () => {
        switch (section) {
            case sections.contactPersons: {
                return renderContactPersonsSection();
            }
            case sections.general: {
                return externalOrganization ? renderExternalGeneralSection() : renderInternalGeneralSection();
            }
            case sections.contract: {
                return renderContractSection();
            }
            case sections.delete: {
                return renderDeleteSection();
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

    const {open, cancel, action, question, okButton} = confirmation;
    return (
        <div
            className="my-organization-outer-container">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("forms.delete")}
                                         confirmationTxt={okButton}
                                         isDeleteAction={true}
                                         children={<ConnectionInUseWarning
                                             identityProviders={affectedIdentityProviders}
                                             unit={units.organization}
                                             applicationName="N/A"/>}
                                         question={question}
            />}
            <div className="my-organization-header-container">
                <div className="top-header">
                    <h1 className="text-[length:var(--text-2xl-font-size)]">{I18n.t("myOrganization.title")}</h1>
                </div>
                <p dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("myOrganization.info"),
                        {ADD_ATTR: ['target'], ADD_TAGS: ['rel']})}}/>
            </div>
            <div className="my-organization">
                <h1 className="text-[length:var(--text-2xl-font-size)]">{I18n.t("myOrganization.maintenance", {name: originalOrganizationName})}</h1>
                <div className="menu-container">
                    <div className="left-menu">
                        {availableSections
                            .map((s, index) =>
                                <div key={index}
                                     className={`menu-item ${s === section ? "active" : ""}`}
                                     onClick={() => changeTab(s)}>
                                    <span>{I18n.t(`myOrganization.${s}`)}</span>
                                </div>
                            )}
                    </div>
                    <div className="right-menu">
                        {renderCurrentSection()}
                    </div>
                </div>
                {(section !== sections.delete && section !== sections.contract && adminUser) &&
                    <div className="actions proceed">
                        <Button onClick={() => externalOrganization ? saveExternalOrganization() : saveInternalOrganization()}
                                disabled={!initial && !contactSectionValid(organization) && isEmpty(organization.name)}
                        >
                            <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("myOrganization.proceedButton"))}}/>
                        </Button>
                    </div>}

            </div>
        </div>

    )

};
export default MyOrganization;
