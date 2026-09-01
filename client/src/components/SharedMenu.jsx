import I18n from "../locale/I18n";
import "./SharedMenu.scss"
import {useLocation, useNavigate} from "react-router";
import React, {useMemo} from "react";
import {useShallow} from "zustand/react/shallow";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarSeparator, SidebarTrigger,
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from "@surfnet/curve-react";
import {CaretUpDownIcon, CheckIcon, GearIcon} from "@phosphor-icons/react";

import {useAppStore} from "../stores/AppStore.js";
import {ORGANIZATION_STATUSES} from "../utils/Manage.js";
import {allMenuGroups} from "../utils/MenuItems.js";
import {sanitize} from "../utils/Utils.js";
import LogoMark from "../icons/figma/logo-mark.svg";
import LogoPath from "../icons/figma/logo-path.svg";
import {BreadCrumb} from "./BreadCrumb.jsx";

export const SharedMenu = () => {

    const {menuItems, currentOrganization, activeMenuItem, user} = useAppStore(useShallow(state => ({
        menuItems: state.menuItems,
        currentOrganization: state.currentOrganization,
        activeMenuItem: state.activeMenuItem,
        user: state.user
    })));

    const navigate = useNavigate();
    const currentLocation = useLocation();

    const filteredMenuGroups = useMemo(() => {
        return allMenuGroups
            .map(menuGroup => ({
                label: menuGroup.label ? I18n.t(`navigation.${menuGroup.label}`) : null,
                className: menuGroup.className,
                items: menuGroup.items
                    .filter(menuItem => menuItems.includes(menuItem.name))
                    .map(menuItem => ({
                        Logo: menuItem.Logo,
                        label: I18n.t(`navigation.${menuItem.name}`),
                        name: menuItem.name,
                        active: menuItem.name === activeMenuItem,
                        href: menuItem.path.replace("organizationId", currentOrganization?.id)
                    }))
            }))
            .filter(menuGroup => menuGroup.items.length > 0);
    }, [activeMenuItem, menuItems, currentOrganization]);

    const setActiveMenuItem = menuItem => {
        navigate(menuItem.href);
        useAppStore.setState(() => ({
            activeMenuItem: menuItem.name
        }));
    }

    const switchOrganization = organization => {
        localStorage.setItem("organization", organization.id.toString());
        window.location.href = "/home";
    }

    if (currentLocation.pathname === "/landing") {
        return null;
    }

    const organizations = (user.organizationMemberships || []).map(om => om.organization);
    const canSwitchOrganization = organizations.length > 1;
    const isPendingApproval = currentOrganization?.status === ORGANIZATION_STATUSES.PENDING_APPROVAL;
    const StatusIcon = isPendingApproval ? GearIcon : CheckIcon;
    const statusTooltip = isPendingApproval ? I18n.t("organizations.tooltip") : I18n.t("organizations.tooltipApproved");

    const organizationButtonContent = (
        <>
            <span className="organization-name">{currentOrganization?.name}</span>
            <Tooltip>
                <TooltipTrigger render={<StatusIcon className="organization-status"/>}/>
                <TooltipContent side="bottom">
                    <span dangerouslySetInnerHTML={{__html: sanitize(statusTooltip)}}/>
                </TooltipContent>
            </Tooltip>
            {canSwitchOrganization && <CaretUpDownIcon className="organization-caret"/>}
        </>
    );

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" onClick={() => navigate("/")} className="brand-button">
                            <span className="brand-lockup">
                                <span className="brand-tag">
                                    <LogoMark className="brand-mark"/>
                                    <span className="brand-label">Access</span>
                                </span>
                                <span className="brand-path" aria-hidden="true"><LogoPath/></span>
                            </span>
                            <SidebarTrigger/>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <SidebarSeparator/>
                <SidebarMenu>
                    <SidebarMenuItem>
                        {canSwitchOrganization ?
                            <DropdownMenu>
                                <DropdownMenuTrigger render={
                                    <SidebarMenuButton size="lg">
                                        {organizationButtonContent}
                                    </SidebarMenuButton>
                                }/>
                                <DropdownMenuContent align="start" className="organization-switch-content">
                                    <DropdownMenuGroup>
                                        {organizations.map(org =>
                                            <DropdownMenuItem key={org.id} onClick={() => switchOrganization(org)}>
                                                <span className="organization-option-name">{org.name}</span>
                                                {currentOrganization?.id === org.id && <CheckIcon/>}
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            :
                            <SidebarMenuButton size="lg" className="organization-name-static">
                                {organizationButtonContent}
                            </SidebarMenuButton>}
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {filteredMenuGroups.map((group, index) =>
                    <SidebarGroup key={index} className={group.className}>
                        {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map(item =>
                                    <SidebarMenuItem key={item.name}>
                                        <SidebarMenuButton isActive={item.active}
                                                           onClick={() => setActiveMenuItem(item)}>
                                            <item.Logo/>
                                            <span>{item.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                )}
            </SidebarContent>
            {/*<SidebarFooter className="group-data-[collapsible=icon]:hidden">*/}
            {/*    <SharedMenuFooter/>*/}
            {/*</SidebarFooter>*/}
        </Sidebar>
    );
}
