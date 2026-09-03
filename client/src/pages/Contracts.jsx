import React, {useEffect, useState} from "react";
import "./Contracts.scss";
import "../components/Entities.scss";
import I18n from "../locale/I18n";
import {Spinner} from "@surfnet/curve-react";
import {Entities} from "../components/Entities";
import {useAppStore} from "../stores/AppStore";
import {CheckCircleIcon as SignIcon, DotsThreeIcon as MenuIcon} from "@phosphor-icons/react";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {unsignedContracts, updateContract} from "../api";
import {isEmpty} from "../utils/Utils.js";

export const Contracts = () => {

    const setFlash = useAppStore(state => state.setFlash);
    const config = useAppStore(state => state.config);

    const [contracts, setContracts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refresh, setRefresh] = useState(new Date());
    const [dropDownActive, setDropDownActive] = useState(-1);
    const [confirmation, setConfirmation] = useState({});

    useEffect(() => {
        unsignedContracts().then(res => {
            setContracts(res);
            setLoading(false);
        });
    }, [refresh]);

    const doSignContract = (contract, confirmationRequired) => {
        if (confirmationRequired) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doSignContract(contract, false),
                question: I18n.t("contracts.confirmation", {name: contract.signeeName}),
                okButton: I18n.t("contracts.sign"),
            });
        } else {
            setLoading(true);
            setConfirmation({open: false});
            setDropDownActive(-1);
            updateContract(contract.application.id, {...contract, signedContract: true}).then(() => {
                setLoading(false);
                setFlash(I18n.t("contracts.flash.signed", {name: contract.signeeName}));
                setRefresh(new Date());
            });
        }
    };

    const renderMenu = contract => {
        return (
            <div className="dropdown-menu">
                <ul>
                    <li onClick={() => doSignContract(contract, true)}>
                        <SignIcon/>
                        <span>{I18n.t("contracts.sign")}</span>
                    </li>
                </ul>
            </div>
        );
    };

    const columns = [
        {
            key: "signee",
            header: I18n.t("contracts.signee"),
            nonSortable: true,
            mapper: contract => (
                <div>
                    <span className="signee-name">{contract.signeeName}</span>
                    <span className="signee-email">{contract.email}</span>
                </div>
            ),
        },
        {
            key: "providerName",
            header: I18n.t("contracts.providerName"),
            mapper: contract => <span>{contract.providerName}</span>,
        },
        {
            key: "applicationName",
            header: I18n.t("contracts.applicationName"),
            mapper: contract => <span>{contract.applicationName}</span>,
        },
        {
            key: "ticketKey",
            header: I18n.t("contracts.ticketKey"),
            mapper: contract => contract.ticketKey
                ? <a href={`${config.jiraBrowseBaseUrl}/${contract.ticketKey}`}
                     target="_blank"
                     rel="noreferrer">{contract.ticketKey}</a>
                : "-",
        },
        {
            key: "telephone",
            header: I18n.t("contracts.telephone"),
            mapper: contract => <span>{contract.telephone || "-"}</span>,
        },
        {
            key: "country",
            header: I18n.t("contracts.country"),
            mapper: contract => <span>{contract.country || "-"}</span>,
        },
        {
            key: "buttons",
            header: "",
            nonSortable: true,
            mapper: contract => (
                <div className="top-header"
                     tabIndex={1}
                     onBlur={() => setTimeout(() => setDropDownActive(-1), 175)}>
                    <span className={`menu ${dropDownActive === contract.id ? "drop-down" : ""}`}
                          onClick={() => setDropDownActive(dropDownActive === -1 ? contract.id : -1)}>
                        <MenuIcon className="menu-icon"/>
                        {dropDownActive === contract.id && renderMenu(contract)}
                    </span>
                </div>
            ),
        },
    ];

    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>;
    }

    const {open, cancel, action, question, okButton} = confirmation;

    return (
        <div className="mod-contracts">
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationHeader={I18n.t("confirmationDialog.confirm")}
                                         confirmationTxt={okButton}
                                         question={question}
            />}
            <Entities entities={contracts}
                      modelName="contracts"
                      defaultSort="signeeName"
                      columns={columns}
                      showNew={false}
                      inputFocus={true}
                      hideTitle={false}
                      title={I18n.t("contracts.unsigned")}
                      searchAttributes={["signeeName", "email", "providerName", "applicationName"]}
                      totalElements={contracts.length}
                      children={isEmpty(contracts) ? <p>{I18n.t("contracts.noContracts")}</p> : null}
                      loading={loading}/>
        </div>
    );
};
