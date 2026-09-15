import "./Relax.scss";
import React, {useEffect} from "react";
import {useAppStore} from "../stores/AppStore";
import I18n from "../locale/I18n";
import {isEmpty} from "../utils/Utils.js";
import {useNavigate} from "react-router";
import DOMPurify from "dompurify";
import {mainMenuItems} from "../utils/MenuItems.js";
import {Button} from "@surfnet/curve-react";

const Relax = () => {
    const user = useAppStore(state => state.user);
    const currentOrganization = useAppStore(state => state.currentOrganization);

    const navigate = useNavigate();

    useEffect(() => {
        if (!isEmpty(currentOrganization?.id)) {
            navigate(`/organization/${currentOrganization.id}`);
        } else if (isEmpty(user.joinRequests)) {
            navigate("/landing");
        } else {
            useAppStore.setState({
                breadcrumbPaths: [
                    {path: "/home", value: I18n.t("breadCrumb.home"), menuItemName: mainMenuItems.home}
                ]
            });
        }
    }, [currentOrganization?.id, navigate, user.joinRequests]);

    return (
        <div className="relax-container">
            <div className="relax-container-inner">
                <h1>{I18n.t("userHome.infoJoinRequestHeader")}</h1>
                <p dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(I18n.t("userHome.infoJoinRequest",
                        {name: user.joinRequests[0].organization.name, email: user.email}))
                }}/>
                <p>{I18n.t("userHome.close")}</p>
                <Button onClick={() => navigate("/home")}>
                    {I18n.t("userHome.toAccess")}
                </Button>
            </div>
        </div>
    )
};
export default Relax;
