import "./UserMembership.scss";

export const UserMembership = ({user}) => {
    return (
        <div className="user-membership">
            <span className="name">{user.name}</span>
            <span className="email">{user.email}</span>
        </div>
    );
}
