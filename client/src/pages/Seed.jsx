import React, {useState} from "react";
import I18n from "../locale/I18n";
import {Button} from "@surfnet/sds";
import {demoSeed} from "../api/index.js";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";

export const Seed = () => {
    const [loading, setLoading] = useState(false);
    const [seeded, setSeeded] = useState(false);
    const [confirmationOpen, setConfirmationOpen] = useState(false);

    const runSeed = () => {
        setConfirmationOpen(false);
        setLoading(true);
        setSeeded(false);
        demoSeed()
            .then(() => {
                setSeeded(true);
            })
            .finally(() => setLoading(false));
    };

    return (
        <div className="mod-cron-container">
            <div className="mod-cron">
                <div className="actions">
                    <span>{I18n.t("system.seed.info")}</span>
                    {!loading &&
                        <Button onClick={() => setConfirmationOpen(true)}
                                txt={I18n.t("system.seed.trigger")}/>}
                    {loading && (
                        <div className="seed-loading">
                            <span className="spinner"/>
                        </div>
                    )}
                </div>
                {seeded && !loading && (
                    <p className="seed-success">{I18n.t("system.seed.success")}</p>
                )}
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
