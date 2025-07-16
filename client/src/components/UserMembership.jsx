import "./UserMembership.scss";
import {Chip, ChipType} from "@surfnet/sds";
import I18n from "../locale/I18n.js";

export const UserMembership = ({user, currentUser}) => {
    return (
        <div className="user-membership-container">
            <div className="user-membership">
                <span className="name">{user.name}</span>
                <span className="email">{user.email}</span>
            </div>
            {user.id === currentUser.id &&
                <Chip type={ChipType.Status_info} label={I18n.t("users.you")}/>
            }
        </div>
    );
}
