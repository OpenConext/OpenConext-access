import React, {useCallback, useEffect, useRef, useState} from "react";
import "./Manage.scss";
import I18n from "../locale/I18n";
import "../components/Entities.scss";
import {Entities} from "../components/Entities";
import {autoCompleteEntities} from "../api";
import {isEmpty} from "../utils/Utils";
import {useDebouncedCallback} from "use-debounce";
import {providerName, providerOrganizationName} from "../utils/Manage.js";
import SelectField from "../components/SelectField.jsx";
import {useNavigate} from "react-router";

const entityTypes = ["oidc10_rp", "saml20_sp"]
    .map(type => ({label: I18n.t(`manage.${type}`), value: type}))

export const Manage = () => {

    const [entityType, setEntityType] = useState(entityTypes[0]);
    const [totalElements, setTotalElements] = useState(0);
    const [entities, setEntities] = useState([]);
    const currentQueryRef = useRef("");
    const navigate = useNavigate();

    const search = query => {
        currentQueryRef.current = query;
        if (!isEmpty(query) && query.trim().length > 2) {
            delayedAutocomplete(query);
        }
    };

    const showEntityDetails = entity => {
        navigate(`/manage/details/${entity["type"]}/${entity["_id"]}`);
    }

    const delayedAutocomplete = useDebouncedCallback(useCallback(query => {
        autoCompleteEntities(query, entityType.value).then(res => {
            setEntities(res);
            setTotalElements(res.length);
        });
    }, [entityType]), 375);

    useEffect(() => {
        if (!isEmpty(currentQueryRef.current) && currentQueryRef.current.trim().length > 2) {
            delayedAutocomplete(currentQueryRef.current);
        }
    }, [entityType, delayedAutocomplete]);

    const filters = () => {
        return (
            <SelectField
                value={entityType}
                options={entityTypes}
                searchable={false}
                onChange={option => setEntityType(option)}
                clearable={false}
            />
        )
    }

    const columns = [
        {
            key: "name",
            header: I18n.t("manage.name"),
            mapper: entity => providerName(I18n.locale, entity)
        },
        {
            key: "organization",
            header: I18n.t("manage.organization"),
            mapper: entity => providerOrganizationName(I18n.locale, entity)
        },
        {
            key: "type",
            header: I18n.t("manage.type"),
            mapper: entity => I18n.t(`manage.${entity.type}`)
        },
    ];

    return (
        <div className="mod-entities">
            <Entities entities={entities}
                      modelName="manage"
                      defaultSort="name"
                      columns={columns}
                      showNew={false}
                      filters={filters()}
                      inputFocus={true}
                      hideTitle={true}
                      rowLinkMapper={(e, entity) => showEntityDetails(entity)}
                      customSearch={search}
                      totalElements={totalElements}
            />
        </div>
    );

}
