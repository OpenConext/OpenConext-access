import "./Landing.scss";
import React, {useEffect, useRef, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Loader} from "@surfnet/sds";
import {useNavigate} from "react-router-dom";
import {newOrganization, searchOrganizations} from "../api/index.js";
import {useDebouncedCallback} from 'use-debounce';
import {isEmpty} from "../utils/Utils.js";
import InputField from "../components/InputField.jsx";
import SearchIcon from "@surfnet/sds/icons/functional-icons/search.svg";
import ArrowRight from "@surfnet/sds/icons/functional-icons/arrow-right-2.svg";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {mainMenuItems} from "../utils/MenuItems.js";

const Landing = ({refreshUser}) => {
    const {user, currentOrganization, setFlash} = useAppStore(state => state);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [organizations, setOrganizations] = useState([]);
    const [confirmation, setConfirmation] = useState({});

    const ref = useRef(null);

    const navigate = useNavigate();

    const debouncedFetch = useDebouncedCallback(val => {
        searchOrganizations({query: val, pageSize: 100_000, sort: "name"})
            .then(page => {
                setOrganizations(page.content);
                setLoading(false);
            })
    }, 850);

    useEffect(() => {
        if (!isEmpty(currentOrganization?.id)) {
            navigate(`/organization/${currentOrganization.id}`);
        }
        useAppStore.setState({
            breadcrumbPaths: [
                {path: "/home", value: I18n.t("breadCrumb.access")},
                {value: I18n.t("breadCrumb.landing")}
            ]
        });
        ref.current?.focus();
    }, []);

    const onChangeSearch = e => {
        const val = e.target.value;
        setSearch(val);
        if (!isEmpty(val) && val.trim().length > 2) {
            setLoading(true);
            debouncedFetch(val);
        } else {
            setOrganizations([]);
        }
    }


    const afterOrgCreate = organization => {
        useAppStore.setState({
            currentOrganization: organization
        });
        refreshUser();
        navigate(`/organization/${organization.id}`);
    }

    const createOrganization = () => {
        setLoading(true);
        newOrganization({name: search})
            .then(res => {
                setLoading(false);
                setFlash(I18n.t("welcome.flash", {name: res.name}));
                setConfirmation({
                    open: true,
                    action: () => afterOrgCreate(res),
                    question: I18n.t("welcome.confirmationAfter", {jiraKey: res.ticketKey}),
                    okButton: I18n.t("forms.proceed")
                });
            })
    }
    const {open, action, question, okButton} = confirmation;
    const exactMatch = !isEmpty(organizations) && !isEmpty(search) && search.trim().length > 2 && !loading && organizations
        .some(org => org.name.toLowerCase().trim() === search.toLowerCase().trim());
    return (
        <div className="landing-container">
            {open && <ConfirmationDialog confirm={action}
                                         confirmationHeader={I18n.t("welcome.newOrganization")}
                                         confirmationTxt={okButton}
                                         question={question}
            />}
            <div className="search">
                {loading && <Loader/>}
                <h2>{I18n.t("welcome.greeting", {name: user.givenName})}</h2>
                <p>{I18n.t("welcome.info")}</p>
                <div className="inner-search">
                    <InputField value={search}
                                onChange={onChangeSearch}
                                onRef={el => ref.current = el}
                                placeholder={I18n.t("welcome.searchPlaceholder")}
                    />
                    <SearchIcon/>
                </div>
                <p className="sub-info">{I18n.t("welcome.subInfo")}</p>
                <div className="organizations-container">
                    {!isEmpty(organizations) &&
                        organizations.map((org, index) =>
                            <section key={index} className="organization"
                                     onClick={() => navigate(`/join/${org.id}`)}>
                                <div>
                                    <p>{org.name}</p>
                                    <span>{I18n.t("welcome.organizationMembers", {
                                        memberCount: org.memberCount,
                                        user: I18n.t(`welcome.${org.memberCount === 1 ? "user" : "users"}`),
                                        applicationCount: org.applicationCount,
                                        application: I18n.t(`welcome.${org.applicationCount === 1 ? "application" : "applications"}`)
                                    })}</span>
                                </div>
                                <ArrowRight/>
                            </section>
                        )}
                    {(!isEmpty(search) && !exactMatch && !loading && search.trim().length > 2) && <>
                    {isEmpty(organizations) && <p>{I18n.t("welcome.zeroState")}</p>}
                        <section className="organization register"
                                 onClick={() => createOrganization()}>
                            <p dangerouslySetInnerHTML={{__html: I18n.t("welcome.register", {name: search})}}/>
                            <ArrowRight/>
                        </section>
                    </>}

                </div>
            </div>
        </div>

    )
};
export default Landing;