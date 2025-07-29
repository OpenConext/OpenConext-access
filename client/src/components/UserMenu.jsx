import I18n from "../locale/I18n";
import React, {useState} from "react";
import "./UserMenu.scss";
import {Link, useNavigate} from "react-router-dom";
import {isEmpty, stopEvent} from "../utils/Utils";
import {Button, ButtonType, Loader, UserInfo} from "@surfnet/sds";
import {useAppStore} from "../stores/AppStore";
import {logout} from "../api";
import CaretDown from "../icons/caret_down.svg";

export const UserMenu = ({setIsAuthenticated}) => {

    const user = useAppStore(state => state.user);

    const navigate = useNavigate();

    const [dropDownActive, setDropDownActive] = useState(false);
    const [isSwitchOrganizationOpen, setIsSwitchOrganizationOpen] = useState(false);

    const logoutUser = e => {
        stopEvent(e);
        logout().then(() => {
            useAppStore.setState(() => ({
                currentOrganization: {name: ""},
                breadcrumbPaths: [],
                user: {name: ""}
            }));
            navigate("/authentication-switch");
            setTimeout(() => {
                setIsAuthenticated(false);
                navigate("/home");
            },150)

        });
    }

    const switchOrganization = organization => {
        useAppStore.setState(() => ({
            currentOrganization: organization
        }));
        navigate("/home");
    }

    const renderOrganizationSwitch = () => {
        if (isEmpty(user) || !user.organizationMemberships || user.organizationMemberships.length < 2) {
            return null;
        }
        const organizations = user.organizationMemberships.map(om => om.organization);
        return (
            <div className="organization-switch"
                 tabIndex={1}
                 onBlur={() => setTimeout(() => setIsSwitchOrganizationOpen(false), 475)}>
                <Button onClick={() => setIsSwitchOrganizationOpen(!isSwitchOrganizationOpen)}
                        txt={I18n.t("userMenu.switchOrganization")}
                        icon={<CaretDown/>}
                        type={ButtonType.Secondary}/>
                {isSwitchOrganizationOpen &&
                    <section className="organization-switch-section sds--user-info--dropdown">
                        {organizations.map((org, index) =>
                            <span key={index} onClick={() => switchOrganization(org)}>{org.name}</span>)}
                    </section>}
            </div>
        );
    }

    const renderMenu = () => {
        return (<>
                <ul>
                    <li>
                        <a href="/logout" onClick={logoutUser}>{I18n.t(`landing.header.logout`)}</a>
                    </li>
                </ul>
            {user.superUser && <ul>
                    <li>
                        <Link to="/system">
                            {I18n.t("landing.header.system")}
                        </Link>
                    </li>
                </ul>}
            </>
        )
    }
    if (isEmpty(user)) {
        return <Loader/>;
    }
    return (
        <div className='user-menu-container'>
            {renderOrganizationSwitch()}
            <div className="user-menu"
                 tabIndex={2}
                 onBlur={() => setTimeout(() => setDropDownActive(false), 325)}>
                {user && <UserInfo isOpen={dropDownActive}
                                   children={renderMenu()}
                                   organisationName={user.schacHomeOrganization}
                                   userName={user.name}
                                   toggle={() => setDropDownActive(!dropDownActive)}
                />}
            </div>
        </div>
    );


}
