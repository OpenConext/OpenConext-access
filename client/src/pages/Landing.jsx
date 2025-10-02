import "./Landing.scss";
import React, {useEffect, useRef, useState} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {useNavigate} from "react-router-dom";
import {newOrganization, searchOrganization} from "../api/index.js";
import {useDebouncedCallback} from 'use-debounce';
import {isEmpty} from "../utils/Utils.js";
import InputField from "../components/InputField.jsx";
import SearchIcon from "@surfnet/sds/icons/functional-icons/search.svg";
import ArrowRight from "@surfnet/sds/icons/functional-icons/arrow-right-2.svg";

const Landing = ({refreshUser}) => {

    const {user, setFlash} = useAppStore(state => state);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [organizations, setOrganizations] = useState([]);

    const ref = useRef(null);

    const navigate = useNavigate();

    const debouncedFetch = useDebouncedCallback(val => {
        searchOrganization(val)
            .then(data => {
                setOrganizations(data);
                setLoading(false);
            })
    }, 850);

    useEffect(() => {
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
        if (isEmpty(val)) {
            setOrganizations([]);
        } else {
            setLoading(true);
            debouncedFetch(val);
        }
    }

    const createOrganization = () => {
        setLoading(true);
        newOrganization({name: search})
            .then(res => {
                useAppStore.setState({
                    currentOrganization: res,
                    menuItems: ["users", "yourApps", "allApps"]
                });
                setFlash(I18n.t("welcome.flash", {name: res.name}));
                refreshUser();
                navigate(`/organization/${res.id}`)
            })
    }

    return (
        <div className="landing-container">
            <div className="search">
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
                    {(isEmpty(organizations) && !isEmpty(search) && !loading) && <>
                        <p>{I18n.t("welcome.zeroState")}</p>
                        <section className="organization register"
                                 onClick={() => createOrganization()}>
                            <p dangerouslySetInnerHTML={{__html: I18n.t("welcome.register", {name: search})}}/>
                            <ArrowRight/>
                        </section>
                    </>}
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
                </div>
            </div>
        </div>

    )
};
export default Landing;