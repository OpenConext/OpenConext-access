import I18n from "../locale/I18n";
import React, {useState} from "react";
import "./UserMenu.scss";
import {Link} from "react-router-dom";
import {isEmpty} from "../utils/Utils";
import {Button, ButtonType, Loader, UserInfo} from "@surfnet/sds";
import {useAppStore} from "../stores/AppStore";
import CheckPlain from "../icons/check-plain.svg";
import CaretDown from "../icons/caret_down.svg";
import {useLogout} from '../hooks/UseLogout.jsx';

export const UserMenu = ({setIsAuthenticated}) => {

    const user = useAppStore(state => state.user);
    const currentOrganization = useAppStore(state => state.currentOrganization);

    const [dropDownActive, setDropDownActive] = useState(false);
    const [isSwitchOrganizationOpen, setIsSwitchOrganizationOpen] = useState(false);

    const logoutUser = useLogout();

    const switchOrganization = organization => {
        window.location.href = `/organization/${organization.id}`
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
                            <div key={index}
                                 className="organization-option"
                                 onClick={() => switchOrganization(org)}>
                                <span className={`${currentOrganization.id === org.id ? "active" : ""}`}>
                                    {org.name}
                                </span>
                                {currentOrganization.id === org.id && <span className="check">
                                    <CheckPlain/>
                                </span>}
                            </div>
                        )}
                    </section>}
            </div>
        );
    }

    const renderMenu = () => {
        return (<>
                <ul>
                    <li>
                        <Link to="/profile">
                            {I18n.t("landing.header.profile")}
                        </Link>
                    </li>
                </ul>
                <ul>
                    <li>
                        <a href="/logout" onClick={e => logoutUser(e, setIsAuthenticated)}>
                            {I18n.t("landing.header.logout")}
                        </a>
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
