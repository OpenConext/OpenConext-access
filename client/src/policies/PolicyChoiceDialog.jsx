import React from "react";
import {Button, Dialog, DialogContent, DialogHeader, DialogTitle} from "@surfnet/curve-react";
import I18n from "../locale/I18n";
import {policyTypes} from "../utils/Policy.js";
import "./PolicyChoiceDialog.scss";
import {sanitize} from "../utils/Utils";

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
                            <Button onClick={() => confirm("new", policies, policyType)}>
                                <span dangerouslySetInnerHTML={{__html: sanitize(I18n.t("forms.create"))}}/>
                            </Button>
                        </div>

                    </div>
                )}
            </div>
        )
    }

    return (
        <Dialog open={true} onOpenChange={open => !open && close()}>
            <DialogContent className="policy-choice-dialog">
                <DialogHeader>
                    <DialogTitle>{I18n.t("policies.policyChoices.title")}</DialogTitle>
                </DialogHeader>
                {renderContent()}
            </DialogContent>
        </Dialog>
    );

}

