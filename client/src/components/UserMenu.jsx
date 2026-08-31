import I18n from "../locale/I18n";
import React from "react";
import "./UserMenu.scss";
import {Link} from "react-router";
import {isEmpty} from "../utils/Utils";
import {
    Button,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    Spinner
} from "@surfnet/curve-react";
import {useAppStore} from "../stores/AppStore";
import {CaretDownIcon} from "@phosphor-icons/react";
import {useLogout} from '../hooks/UseLogout.jsx';

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
                <Button variant="ghost" className="user-menu-trigger">
                    <span className="user-menu-textual">
                        <span className="user-menu-name">{user.name}</span>
                        <span className="user-menu-organization">{currentOrganization?.name}</span>
                    </span>
                    <CaretDownIcon/>
                </Button>
            }/>
            <DropdownMenuContent align="end" className="user-menu-content">
                <DropdownMenuGroup>
                    <DropdownMenuLabel>
                        <span className="user-menu-name">{user.name}</span>
                        <span className="user-menu-organization">{currentOrganization?.name}</span>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator/>
                <DropdownMenuItem render={<Link to="/profile">{I18n.t("landing.header.profile")}</Link>}/>
                {user.superUser &&
                    <DropdownMenuItem render={<Link to="/changelog">{I18n.t("landing.header.changelog")}</Link>}/>}
                <DropdownMenuItem onClick={e => logoutUser(e, setIsAuthenticated)}>
                    {I18n.t("landing.header.logout")}
                </DropdownMenuItem>
                {user.superUser &&
                    <DropdownMenuItem render={<Link to="/system">{I18n.t("landing.header.system")}</Link>}/>}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
