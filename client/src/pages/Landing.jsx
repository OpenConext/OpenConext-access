import "./Landing.scss";
import React, {useEffect, useRef, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {Button, Spinner} from "@surfnet/curve-react";
import {useNavigate} from "react-router";
import {newOrganization, searchOrganizationsLandingPage} from "../api/index.js";
import {useDebouncedCallback} from 'use-debounce';
import {isEmpty, stopEvent} from "../utils/Utils.js";
import InputField from "../components/InputField.jsx";
import DOMPurify from "dompurify";
import {MagnifyingGlassIcon as SearchIcon, CaretRightIcon as ArrowRight} from "@phosphor-icons/react";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {StretchedLink} from "../components/StretchedLink.jsx";
import {mainMenuItems} from "../utils/MenuItems.js";
import {useShallow} from "zustand/react/shallow";

const Landing = ({refreshUser}) => {

    const {user, currentOrganization, setFlash} = useAppStore(useShallow(state => ({
        user: state.user,
        currentOrganization: state.currentOrganization,
        setFlash: state.setFlash
    })));

    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [organizations, setOrganizations] = useState([]);
    const [confirmation, setConfirmation] = useState({});

    const ref = useRef(null);

    const navigate = useNavigate();

    const debouncedFetch = useDebouncedCallback(val => {
        searchOrganizationsLandingPage(val)
            .then(res => {
                setOrganizations(res);
                setLoading(false);
            })
    }, 850);

    useEffect(() => {
        useAppStore.setState({
            breadcrumbPaths: [
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
        refreshUser(() => {
            setLoading(false);
            navigate(`/home?new=true`);
            useAppStore.setState(() => ({
                activeMenuItem: mainMenuItems.home
            }));
        });

    }

    const createOrganization = e => {
        stopEvent(e);
        setLoading(true);
        newOrganization({name: search})
            .then(res => {
                afterOrgCreate(res);

                setFlash(I18n.t("welcome.flash", {name: res.name}));
            })
            .catch(() => {
                setLoading(false);
                setConfirmation({
                    open: true,
                    action: () => setConfirmation({open: false}),
                    question: I18n.t("error.jiraDown"),
                    okButton: I18n.t("forms.ok")
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
                {loading && <Spinner/>}
                <h2 className="text-[length:var(--text-xl-font-size)]">{I18n.t("welcome.greeting", {name: user.givenName})}</h2>
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
                {!isEmpty(organizations) && <p className="found">{I18n.t("welcome.found")}</p>}
                <div className="organizations-container">
                    {!isEmpty(organizations) &&

                        organizations.map((org, index) =>
                            <section key={index} className="organization">
                                <StretchedLink to={`/join/${org.id}`}/>
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
                        {isEmpty(organizations) &&
                            <>
                                <p>{I18n.t("welcome.zeroState")}</p>
                                <Button onClick={() => createOrganization()}>
                                    <span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("welcome.registerLink", {name: search}))}}/>
                                </Button>
                            </>}

                        {!isEmpty(organizations) &&
                            <section className="register">
                                <span>{I18n.t("welcome.register")}</span>
                                <a className="actionable" href={"/registrate"} onClick={e => createOrganization(e)}>
                                    <span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("welcome.registerLink", {name: search}))}}/>
                                </a>

                            </section>}
                    </>}

                </div>
            </div>
        </div>

    )
};
export default Landing;
