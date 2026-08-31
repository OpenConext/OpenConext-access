import React from "react";
import "./BreadCrumb.scss";
import {useAppStore} from "../stores/AppStore";
import {isEmpty} from "../utils/Utils";
import DOMPurify from "dompurify";
import {useNavigate} from "react-router";
import {useShallow} from "zustand/react/shallow";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from "@surfnet/curve-react";

export const BreadCrumb = () => {

    const {breadcrumbPaths, clearFlash} = useAppStore(useShallow(state => ({
        breadcrumbPaths: state.breadcrumbPaths,
        clearFlash: state.clearFlash
    })));

    const navigate = useNavigate();

    const paths = breadcrumbPaths.filter(p => !isEmpty(p));

    if (isEmpty(paths)) {
        return null;
    }

    const doNavigate = (e, breadcrumbItem) => {
        e.preventDefault();
        navigate(breadcrumbItem.path);
        clearFlash();
        if (breadcrumbItem.menuItemName) {
            useAppStore.setState(() => ({
                activeMenuItem: breadcrumbItem.menuItemName
            }));
        }
    }

    return (
        <Breadcrumb aria-label="breadcrumbs">
            <BreadcrumbList>
                {paths.map((p, i) => {
                    const isLast = i === paths.length - 1;
                    const isLink = p.path && (!isLast || paths.length === 1);
                    return (
                        <React.Fragment key={i}>
                            {i !== 0 && <BreadcrumbSeparator/>}
                            <BreadcrumbItem>
                                {isLink ?
                                    <BreadcrumbLink href={p.path} onClick={e => doNavigate(e, p)}>
                                        <span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(p.value)}}/>
                                    </BreadcrumbLink>
                                    :
                                    <BreadcrumbPage>
                                        <span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(p.value)}}/>
                                    </BreadcrumbPage>}
                            </BreadcrumbItem>
                        </React.Fragment>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
