import I18n from "../locale/I18n";
import "./ApplicationConnectionHeader.scss"
import {isEmpty, stopEvent} from "../utils/Utils.js";
import {PencilSimpleIcon as PencilIcon, TrashIcon, DotsThreeIcon as MenuIcon} from "@phosphor-icons/react";
import React, {useState} from "react";
import {Link, useNavigate} from "react-router";
import {deleteApplicationById, identityProvidersByUsedConnectionsForApplication, policiesByServiceProviders} from "../api/index.js";
import ConfirmationDialog from "./ConfirmationDialog.jsx";
import {
    Badge,
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Spinner
} from "@surfnet/curve-react";
import {hasApplicationDeleteAccess, hasPolicyWriteAccess, policyServiceProvider} from "../utils/Permissions.js";
import {ConnectionInUseWarning, units} from "../connection/ConnectionInUseWarning.jsx";
import DOMPurify from "dompurify";
import {useAppStore} from "../stores/AppStore.js";

export const ApplicationConnectionHeader = ({tabs, application, user, currentOrganization, currentTab, setTab}) => {

    const setFlash = useAppStore(state => state.setFlash);

    const [dropDownActive, setDropDownActive] = useState(false);
    const [confirmation, setConfirmation] = useState({});
    const [affectedIdentityProviders, setAffectedIdentityProviders] = useState([]);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const doNavigate = (e, tab) => {
        stopEvent(e);
        if (!tab.disabled) {
            setTab(tab.name);
        }
    }

    const doDelete = (e, confirmationRequired) => {
        stopEvent(e);
        if (confirmationRequired) {
            setLoading(true);
            //First, fetch all the possible identityProviders affected by the deletion of this application,
            //and check if any of its connections have outstanding policies that block deletion
            const entityIDs = (application.connections || [])
                .map(c => c.entityID)
                .filter(Boolean);
            Promise.all([
                identityProvidersByUsedConnectionsForApplication(application.id),
                policiesByServiceProviders(entityIDs)
            ]).then(([idpRes, policiesRes]) => {
                setLoading(false);
                if (policiesRes.length > 0) {
                    const policyWriteAccess = hasPolicyWriteAccess(user, application, policiesRes);
                    setConfirmation({
                        open: true,
                        cancel: policyWriteAccess ? () => setConfirmation({}) : null,
                        outstandingPolicies: true,
                        policyWriteAccess: policyWriteAccess,
                        action: () => {
                            setConfirmation({open: false});
                            if (policyWriteAccess) {
                                navigate(`/policies?service=${policyServiceProvider(policiesRes)}`)
                            }
                        },
                        question: null,
                        okButton: policyWriteAccess ? I18n.t("forms.editPolicies") : I18n.t("forms.ok")
                    });
                } else {
                    setAffectedIdentityProviders(idpRes);
                    setConfirmation({
                        open: true,
                        cancel: () => setConfirmation({open: false}),
                        action: () => doDelete(null, false),
                        question: I18n.t("application.deleteConfirmation", {name: application.name}),
                        okButton: I18n.t(isEmpty(idpRes) ? "forms.delete" : "forms.deleteAnyway")
                    });
                }
            });
        } else {
            setLoading(true);
            setAffectedIdentityProviders([]);
            deleteApplicationById(application.id).then(() => {
                setConfirmation({});
                navigate(`/organization/${currentOrganization.id}`);
                setLoading(false);
                setFlash(I18n.t("application.deleteFlash"));
            })
        }
    }

    const renderMenu = () => {
        const mayDelete = hasApplicationDeleteAccess(user, application);
        return (
            <DropdownMenu open={dropDownActive} onOpenChange={setDropDownActive}>
                <DropdownMenuTrigger render={
                    <Button variant="ghost" size="icon">
                        <MenuIcon weight="bold" size={34} className="size-[34px]"/>
                    </Button>
                }/>
                <DropdownMenuContent align="end" className="action-menu-content">
                    <DropdownMenuGroup>
                        <DropdownMenuItem render={
                            <Link to={`/application/${application.id}`} className="menu-item-link">
                                <PencilIcon/>
                                {I18n.t("forms.edit")}
                            </Link>
                        }/>
                        {mayDelete && <DropdownMenuItem onClick={e => doDelete(e, true)}>
                            <TrashIcon/>
                            {I18n.t("forms.delete")}
                        </DropdownMenuItem>}
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    }

    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>
    }

    const {open, cancel, action, question, okButton, outstandingPolicies, policyWriteAccess} = confirmation;
    return (
        <div className="application-connection-header-container">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("forms.delete")}
                                         confirmationTxt={okButton}
                                         isDeleteAction={!outstandingPolicies}
                                         children={outstandingPolicies ?
                                             <p dangerouslySetInnerHTML={{
                                                 __html: DOMPurify.sanitize(
                                                     I18n.t(`application.${policyWriteAccess ? "policyWriteAccess" : "outstandingPolicies"}`),
                                                     {ADD_ATTR: ["href"], ADD_TAGS: ["a"]})
                                             }}/> :
                                             <ConnectionInUseWarning
                                                 identityProviders={affectedIdentityProviders}
                                                 unit={units.application}
                                                 applicationName={application.name}/>
                                         }
                                         question={question}
            />}

            <div className="top-header">
                <div className="top-header-title">
                    <h1 className="text-[length:var(--text-2xl-font-size)]">{application.name}</h1>
                    {renderMenu()}
                </div>
                <div className="menu-container">
                    {application.type === "CONTENT" &&
                        <Badge variant="info" className="mr-[18px]">
                            {I18n.t("application.contentAbbreviation")}
                        </Badge>}
                </div>
            </div>

            <div className="tabs-menu">
                {tabs.map(tab => <a key={tab.name}
                                    href={`/connection/${application.id}/${tab.name}`}
                                    className={tab.name === currentTab ? "active" : tab.disabled ? "disabled" : ""}
                                    onClick={e => doNavigate(e, tab)}>
                    {I18n.t(`connection.${tab.name}`)}
                </a>)}
            </div>
        </div>
    );
}
