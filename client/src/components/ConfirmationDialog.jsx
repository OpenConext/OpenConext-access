import React, {useState} from "react";
import {Modal,} from "@surfnet/sds";
import I18n from "../locale/I18n";


export default function ConfirmationDialog({
                                               cancel,
                                               confirm,
                                               question = "",
                                               isError = false,
                                               isDeleteAction = false,
                                               disabledConfirm = false,
                                               children = null,
                                               confirmationTxt = null,
                                               largeWidth = false,
                                               confirmationHeader = null
                                           }) {
    const [busy, setBusy] = useState(false);

    return (
        <Modal
            confirm={() => {
                setBusy(true);
                confirm();
            }}
            cancel={cancel}
            alertType={null}
            question={question}
            isError={isError}
            isWarning={isDeleteAction}
            children={children}
            title={confirmationHeader}
            cancelButtonLabel={I18n.t("confirmationDialog.cancel")}
            confirmationButtonLabel={confirmationTxt}
            confirmDisabled={disabledConfirm || (busy && cancel)}
            subTitle={null}
            full={largeWidth}/>
    );

}

