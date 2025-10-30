import React from "react";
import "./BreadCrumb.scss";
import {useAppStore} from "../stores/AppStore";
import {Link} from "react-router-dom";
import {isEmpty, stopEvent} from "../utils/Utils";
import DOMPurify from "dompurify";
import ArrowRight from "../icons/arrow-right.svg";
import {useNavigate} from "react-router";

export const BreadCrumb = () => {

    const {breadcrumbPaths, clearFlash} = useAppStore(state => state);
    const navigate = useNavigate();


    if (isEmpty(breadcrumbPaths)) {
        return null;
    }

    const doNavigate = (e, breadcrumbItem) => {
        stopEvent(e);
        navigate(breadcrumbItem.path);
        clearFlash();
        if (breadcrumbItem.menuItemName) {
            useAppStore.setState(() => ({
                activeMenuItem: breadcrumbItem.menuItemName
            }));
        }
    }

    return (
        <nav className="sds--breadcrumb sds--text--body--small" aria-label="breadcrumbs">
            <ol className="sds--breadcrumb--list">
                {breadcrumbPaths
                    .filter(p => !isEmpty(p))
                    .map((p, i) =>
                        <li key={i}>
                            {i !== 0 && <ArrowRight/>}
                            {(((i + 1) !== breadcrumbPaths.length || breadcrumbPaths.length === 1) && p.path) &&
                                <a href={p.path} onClick={e => doNavigate(e, p)}>
                                    {<span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(p.value)}}/>}
                                </a>}
                            {((i + 1) !== breadcrumbPaths.length && !p.path) &&
                                <span className={"last"}
                                      dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(p.value)}}/>}
                            {((i + 1) === breadcrumbPaths.length && breadcrumbPaths.length !== 1) &&
                                <span className={"last"}
                                      dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(p.value)}}/>}
                        </li>)}
            </ol>

        </nav>
    );
}