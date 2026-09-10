import "./UserMembership.scss";
import {Badge} from "@surfnet/curve-react";
import I18n from "../locale/I18n.js";

export const UserMembership = ({user, currentUser}) => {
    return (
        <div className="user-membership-container">
            <div className="user-membership">
                <span className="name">{user.name}</span>
                <span className="email">{user.email}</span>
            </div>
            {user.id === currentUser.id &&
                <Badge variant="secondary">{I18n.t("users.you")}</Badge>
            }
        </div>
    );
}
