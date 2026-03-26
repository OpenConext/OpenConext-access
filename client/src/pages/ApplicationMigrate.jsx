import "./ApplicationMigrate.scss";
import "../styles/access_card.scss";
import React, {useEffect, useState} from "react";
import {allAplicationsLight, migrateApplication, organizationsLight} from "../api/index.js";
import I18n from "../locale/I18n.js";
import {Button, ButtonType, Loader} from "@surfnet/sds";
import {isEmpty} from "../utils/Utils.js";
import ConfirmationDialog from "../components/ConfirmationDialog.jsx";
import SelectField from "../components/SelectField.jsx";
import {useAppStore} from "../stores/AppStore.js";

const ApplicationMigrate = () => {
    const setFlash = useAppStore(state => state.setFlash);

    const [loading, setLoading] = useState(true);
    const [organization, setOrganization] = useState(null);
    const [organizations, setOrganizations] = useState([]);
    const [application, setApplication] = useState(null);
    const [applications, setApplications] = useState([]);
    const [confirmation, setConfirmation] = useState({});

    useEffect(() => {
        Promise.all([allAplicationsLight(), organizationsLight()])
            .then(res => {
                setApplications(res[0].map(app => ({...app, label: `${app.name} (${app.org_name})`, value: app.id})));
                setOrganizations(res[1].map(org => ({...org, label: org.name, value: org.id})));
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <Loader/>
    }

    const doMigrate = confirm => {
        if (confirm) {
            setConfirmation({
                open: true,
                cancel: () => setConfirmation({open: false}),
                action: () => doMigrate(false),
                title: I18n.t("applicationMigrate.migrate"),
                question: I18n.t("applicationMigrate.migrateConfirmation", {
                    application: application.name,
                    organisation: application.org_name,
                    newOrganisation: organization.label
                }),
                okButton: I18n.t("applicationMigrate.migrate")
            })
        } else {
            setLoading(true);
            setConfirmation({});
            migrateApplication(application.id, organization.id)
                .then(() => {
                    setOrganization(null);
                    setLoading(false);
                    setFlash(I18n.t("applicationMigrate.flash.migrated", {
                        application: application.name,
                        organisation: organization.label
                    }))
                })
        }
    }

    const applicationChanged = option => {
        setApplication(option);
        setOrganization(null)
    }

    const renderConnection = () => {
        return (
            <div className="manage-info">
                <p>{I18n.t("applicationMigrate.findApplicationInfo")}</p>
                <div className="migrate">
                    <SelectField name={I18n.t("applicationMigrate.findApplication")}
                                 value={application}
                                 options={applications}
                                 searchable={true}
                                 placeholder={I18n.t("applicationMigrate.findApplicationPlaceholder")}
                                 onChange={applicationChanged}
                    />
                    <SelectField name={I18n.t("applicationMigrate.chooseOrganisation")}
                                 value={organization}
                                 options={organizations
                                     .filter(org => org.id !== application?.org_id)}
                                 searchable={true}
                                 placeholder={I18n.t("applicationMigrate.chooseOrganisationPlaceholder")}
                                 onChange={val => setOrganization(val)}
                    />
                    <div className="options">
                        <Button onClick={() => doMigrate(true)}
                                type={ButtonType.DestructivePrimary}
                                disabled={isEmpty(organization)}
                                txt={I18n.t("applicationMigrate.migrate")}/>
                    </div>
                </div>
            </div>
        );
    }

    const {open, cancel, action, question, title, okButton} = confirmation;

    return (
        <div className={`manage-migrate-container`}>
            {open && <ConfirmationDialog confirm={action}
                                         cancel={cancel}
                                         confirmationTxt={okButton}
                                         confirmationHeader={title}
                                         question={question}>
            </ConfirmationDialog>}
            <div className="inner-manage-migrate-container">
                {renderConnection()}
            </div>
        </div>
    );
}

export default ApplicationMigrate;