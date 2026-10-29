import React from "react";
import {Navigate, useLocation} from "react-router";
import {Spinner} from "@surfnet/curve-react";
import {useShallow} from "zustand/react/shallow";
import {useAppStore} from "../stores/AppStore";
import {isEmpty} from "../utils/Utils.js";
import {mainMenuItems} from "../utils/MenuItems.js";
import {authorities, currentUserMembershipAuthority} from "../utils/Permissions.js";
import UserHome from "./UserHome.jsx";
import UserHomeMember from "./UserHomeMember.jsx";

//Only the admins and members of an institution have a home (see MenuService), all others land on their apps
const HomeSwitch = () => {

    const {search} = useLocation();

    const {user, currentOrganization, menuItems} = useAppStore(useShallow(state => ({
        user: state.user,
        currentOrganization: state.currentOrganization,
        menuItems: state.menuItems
    })));

    if (isEmpty(currentOrganization?.id)) {
        return <UserHome/>;
    }
    //The menu decides if there is a home, so wait for it instead of flashing a home for a user that has none
    if (isEmpty(menuItems)) {
        return <div className="loading-container"><Spinner className="size-8"/></div>;
    }
    if (!menuItems.includes(mainMenuItems.home)) {
        return <Navigate to={`/organization/${currentOrganization.id}${search}`} replace/>;
    }
    const membership = (user.organizationMemberships || [])
        .find(m => m.organization.id === currentOrganization.id);
    const isMember = currentUserMembershipAuthority(user, membership) === authorities.MEMBER;
    return isMember ? <UserHomeMember/> : <UserHome/>;
};
export default HomeSwitch;
