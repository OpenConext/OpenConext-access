import "./Statistics.scss";
import React from "react";
import I18n from "../locale/I18n";
import ToggleSegmentButton from "../components/ToggleSegmentButton.jsx";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";

const Statistics = () => {

    const { currentOrganization} = useAppStore(useShallow(state => ({
        currentOrganization: state.currentOrganization
    })));
    // useEffect(() => {
    //     useAppStore.setState({
    //         breadcrumbPaths: [
    //             {path: "/home", value: I18n.t("breadCrumb.access"), menuItemName: mainMenuItems.home},
    //             {value: I18n.t(`external.${app}.title`)}
    //         ],
    //         activeMenuItem: mainMenuItems[app]
    //     });
    // }, [app]);


    return (
        <div className="statistics-container">
            <div className="statistics-header">
                <div className="title">
                    <h2>{I18n.t("statistics.title")}</h2>
                    <p>{I18n.t("statistics.login", {name: currentOrganization.name})}</p>
                </div>
                <div className="statistics-menu">
                    
                </div>

            </div>

            <ToggleSegmentButton
                value={'logins'}
                onChange={() => true}
                options={[
                    {value: 'logins', label: 'Logins'},
                    {value: 'users', label: 'Unique users'}
                ]}
            />

        </div>
    )
};
export default Statistics;