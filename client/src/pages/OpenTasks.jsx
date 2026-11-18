import "./OpenTasks.scss";
import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router";
import {Badge, Button} from "@surfnet/curve-react";
import {ArrowRightIcon} from "@phosphor-icons/react";
import I18n from "../locale/I18n";
import {auditLogTasks} from "../api/index.js";
import {isEmpty} from "../utils/Utils.js";

//The items that wait for an action of an institution admin, not bound to a period
const OpenTasks = ({organizationId}) => {

    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);

    useEffect(() => {
        auditLogTasks(organizationId).then(setTasks).catch(() => setTasks([]));
    }, [organizationId]);

    if (isEmpty(tasks)) {
        return null;
    }

    const destination = task => {
        switch (task.type) {
            case "JOIN_REQUEST":
                return `/users/${organizationId}/joins`;
            case "CHANGE_REQUEST":
                return task.applicationId ? `/connection/${task.applicationId}` : null;
            default:
                return null;
        }
    };

    const params = task => ({
        name: task.name || I18n.t("auditLog.system"),
        target: task.targetName || "",
        organization: task.organizationName || ""
    });

    return (
        <section className="open-tasks">
            <div className="open-tasks-header">
                <h2>{I18n.t("userHome.openTasks.title")}</h2>
                <Badge variant="success">{tasks.length}</Badge>
                <span className="spacer"/>
            </div>
            <div className="task-list">
                {tasks.map((task, index) => {
                    const path = destination(task);
                    return (
                        <div className="task" key={`${task.type}_${task.id || index}`}>
                            <span className="task-marker" aria-hidden="true"/>
                            <div className="what">
                                <span className="title">{I18n.t(`userHome.openTasks.${task.type}.title`, params(task))}</span>
                                <span className="description">{I18n.t(`userHome.openTasks.${task.type}.description`, params(task))}</span>
                            </div>
                            {path && <Button variant="outline" size="sm" onClick={() => navigate(path)}>
                                {I18n.t(`userHome.openTasks.${task.type}.action`)}
                                <ArrowRightIcon/>
                            </Button>}
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default OpenTasks;
