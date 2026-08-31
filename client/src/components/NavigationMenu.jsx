import React, {Fragment, useState} from "react";
import "./NavigationMenu.scss";
import {Logo, LogoType, LogoColor} from "./Logo";
import {Tooltip, TooltipContent, TooltipTrigger} from "@surfnet/curve-react";
import {CaretDoubleLeftIcon, GearIcon} from "@phosphor-icons/react";
import {sanitize, stopEvent} from "../utils/Utils";

export const NavigationMenu = (props) => {

    const [collapsed, setCollapsed] = useState(false);

    const onClick = (e, item) => {
        stopEvent(e);
        props.setActiveMenuItem(item);
    }

    const itemElement = (item, index) => {
        return (
            <div key={index}
                 onClick={e => onClick(e, item)}
                 className={`sds--navigation-menu-item ${item.active ? "active" : ""}`}>
                <item.Logo/>
                <span className="link">{item.label}</span>
            </div>
        );
    }

    return (
        <div className={`sds--navigation-menu ${collapsed && "collapsed"}`}>
            <div className="sds--navigation-menu-header">
                {!collapsed && <Logo action={props.logoAction} label={props.logoLabel} position={LogoType.Bottom} color={LogoColor.White}/>}
                <div className={`close-container ${collapsed && "collapsed"}`}
                     onClick={() => setCollapsed(!collapsed)}>
                    <CaretDoubleLeftIcon/>
                </div>
            </div>
            {!collapsed &&
                <div className="sds--navigation-menu-inner">
                    {props.title &&
                        <div className="sds--navigation-menu-title">
                            <h2>{props.title}</h2>
                            {props.settingToolTip &&
                                <Tooltip>
                                    <TooltipTrigger render={props.SettingLogo ? <props.SettingLogo/> : <GearIcon/>}/>
                                    <TooltipContent side="bottom"><span dangerouslySetInnerHTML={{__html: sanitize(props.settingToolTip)}}/></TooltipContent>
                                </Tooltip>}
                        </div>}
                    <div className="sds--navigation-menu-items">
                        {props.groups.map((group, index) =>
                            <div key={index} className={`sds--navigation-group-item ${group.className || ""}`}>
                                {group.label && <p className="group-label">{group.label}</p>}
                                {group.items.map((item, innerIndex) => {
                                    const itemDiv = itemElement(item, innerIndex);
                                    return item.tooltip ? <Fragment key={innerIndex}>
                                        <Tooltip>
                                            <TooltipTrigger render={itemDiv}/>
                                            <TooltipContent side="right"><span dangerouslySetInnerHTML={{__html: sanitize(item.tooltip)}}/></TooltipContent>
                                        </Tooltip>
                                    </Fragment> : itemDiv;
                                })}
                            </div>
                        )}
                    </div>
                </div>}
            <div className={`sds--navigation-menu-children ${collapsed && "collapsed"}`}>
                {props.children && props.children}
            </div>
        </div>
    );
};

export default NavigationMenu;
