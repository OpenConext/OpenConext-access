import React from "react";
import {Button, Modal} from "@surfnet/sds";
import I18n from "../locale/I18n";
import {policyTypes} from "../utils/Policy.js";
import "./PolicyChoiceDialog.scss";

export default function PolicyChoiceDialog({
                                               confirm,
                                               close,
                                               policies
                                           }) {

    const renderContent = () => {
        return (
            <div className="policy-choice">
                {Object.keys(policyTypes).map(policyType =>
                    <div key={policyType} className="policy-card">
                        <h3>{I18n.t(`policies.policyChoices.${policyType}Title`)}</h3>
                        <span className="info">{I18n.t(`policies.policyChoices.${policyType}Info`)}</span>
                        <span className="choice">{I18n.t(`policies.policyChoices.${policyType}Choice`)}</span>
                        <span className="explanation">{I18n.t(`policies.policyChoices.${policyType}Explanation`)}</span>
                        <div className={"button-container"}>
                            <Button txt={I18n.t("forms.create")}
                                    onClick={() => confirm("new", policies, policyType)}/>
                        </div>

                    </div>
                )}
            </div>
        )
    }

    return (
        <Modal
            children={renderContent()}
            close={close}
            className={"policy-choice-dialog"}
            title={I18n.t("policies.policyChoices.title")}
            full={false}/>
    );

}

