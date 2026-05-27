import React, {useState} from "react";
import I18n from "../locale/I18n";
import {Button} from "@surfnet/sds";
import {demoSeed} from "../api/index.js";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import {useAppStore} from "../stores/AppStore.js";

export const Seed = () => {
    const setFlash = useAppStore(state => state.setFlash);

    const [loading, setLoading] = useState(false);
    const [confirmationOpen, setConfirmationOpen] = useState(false);

    const runSeed = () => {
        setConfirmationOpen(false);
        setLoading(true);
        demoSeed()
            .then(() => {
                setFlash(I18n.t("system.seed.success"));
                setLoading(false);
            })
            .catch(() => setFlash(I18n.t("system.seed.error"), "error"));
    };

    return (
        <div className="mod-cron-container">
            <div className="mod-cron">
                <div className="actions">
                    <span>{I18n.t("system.seed.info")}</span>
                    <Button onClick={() => setConfirmationOpen(true)}
                            disabled={loading}
                            txt={I18n.t("system.seed.trigger")}/>

                </div>
            </div>
            {confirmationOpen && (
                <ConfirmationDialog
                    isDeleteAction={true}
                    confirmationHeader={I18n.t("system.seed.confirmationHeader")}
                    question={I18n.t("system.seed.confirmationQuestion")}
                    confirm={runSeed}
                    cancel={() => setConfirmationOpen(false)}
                    confirmationTxt={I18n.t("system.seed.trigger")}
                />
            )}
        </div>
    );
};
