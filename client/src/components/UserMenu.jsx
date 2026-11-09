import I18n from "../locale/I18n";
import React from "react";
import "./UserMenu.scss";
import {Link} from "react-router";
import {isEmpty} from "../utils/Utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    SidebarMenuButton,
    Spinner
} from "@surfnet/curve-react";
import {useAppStore} from "../stores/AppStore";
import {CaretRightIcon, UserCircleIcon} from "@phosphor-icons/react";
import {useLogout} from '../hooks/UseLogout.jsx';

//Rendered in the footer of the sidebar, the menu opens to the right of the sidebar
export const UserMenu = ({setIsAuthenticated}) => {

    const user = useAppStore(state => state.user);
    const currentOrganization = useAppStore(state => state.currentOrganization);

    const logoutUser = useLogout();

    if (isEmpty(user)) {
        return <div className="loading-container"><Spinner className="size-8"/></div>;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={
                <SidebarMenuButton size="lg" className="user-menu-trigger">
                    <UserCircleIcon className="user-menu-icon"/>
                    <span className="user-menu-textual">
                        <span className="user-menu-name">{user.name}</span>
                        <span className="user-menu-organization">{currentOrganization?.name}</span>
                    </span>
                    <CaretRightIcon className="user-menu-caret"/>
                </SidebarMenuButton>
            }/>
            <DropdownMenuContent side="right" align="end" className="user-menu-content">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>
                        <span className="user-menu-name">{user.name}</span>
                        <span className="user-menu-organization">{currentOrganization?.name}</span>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator/>
                <DropdownMenuItem render={<Link to="/profile">{I18n.t("landing.header.profile")}</Link>}/>
                <DropdownMenuItem onClick={e => logoutUser(e, setIsAuthenticated)}>
                    {I18n.t("landing.header.logout")}
                </DropdownMenuItem>
                {user.superUser &&
                    <DropdownMenuItem render={<Link to="/system">{I18n.t("landing.header.system")}</Link>}/>}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
