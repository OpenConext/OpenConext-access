import "./Statistics.scss";
import React, {useState} from "react";
import I18n from "../locale/I18n";
import ToggleSegmentButton from "../components/ToggleSegmentButton.jsx";
import {useAppStore} from "../stores/AppStore.js";
import {useShallow} from "zustand/react/shallow";
import SegmentedControl from "../components/SegmentedControl.jsx";
import PeriodPicker from "../components/PeriodPicker.jsx";
import {Button, ButtonIconPlacement} from "@surfnet/sds";
import ExportIcon from "../icons/export.svg";

const periods = {
    year: "year",
    quarter: "quarter",
    month: "month",
    week: "week",
    custom: "custom",
}

const countOptions = {
    total: "total",
    unique: "unique"
}

const Statistics = () => {

    const {currentOrganization} = useAppStore(useShallow(state => ({
        currentOrganization: state.currentOrganization
    })));

    const [period, setPeriod] = useState(periods.year);
    const [periodValue, setPeriodValue] = useState(new Date().getFullYear());
    const [userIdpOption, setUserIdpOption] = useState(countOptions.total);

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
                    <h5 className="period">{I18n.t("statistics.period")}</h5>
                    <div className="statistics-menu-options">
                        <SegmentedControl onClick={option => setPeriod(option)}
                                          options={Object.keys(periods)}
                                          option={period}
                                          optionLabelResolver={option => I18n.t(`statistics.${option}`)}/>
                        <PeriodPicker value={periodValue} onClick={val => setPeriodValue(val)}/>

                        <Button onClick={() => alert("todo")}
                                className="export"
                                iconPlacement={ButtonIconPlacement.Left}
                                txt={I18n.t("statistics.export")}
                                icon={<ExportIcon/>}/>

                    </div>
                </div>
            </div>
            <div className="main-stats">
                <section className="cardy">
                    <div className="stat">
                        <h1>3.92M</h1>
                        <p>{I18n.t("statistics.total")} </p>
                        <span className="blue"/>
                    </div>
                </section>
                <section className="cardy">
                    <div className="stat">
                        <h1>73.16K</h1>
                        <p>{I18n.t("statistics.unique")} </p>
                        <span className="green"/>
                    </div>
                </section>
            </div>
            <section className="cardy">
                <ToggleSegmentButton
                    value={userIdpOption}
                    onChange={option => setUserIdpOption(option)}
                    options={Object.keys(countOptions).map(option => ({
                        value: option,
                        label: I18n.t(`statistics.${option}`)
                    }))}
                />
            </section>

        </div>
    )
};
export default Statistics;