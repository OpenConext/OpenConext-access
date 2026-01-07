import React, {useEffect, useRef, useState} from "react";
import I18n from "../locale/I18n";
import SearchIcon from "@surfnet/sds/icons/functional-icons/search.svg";
import {isEmpty} from "../utils/Utils";
import {sortObjects, valueForSort} from "../utils/Sort";
import "./Entities.scss";
import {Button, ButtonType, Loader, Pagination, Tooltip} from "@surfnet/sds";
import {pageCount, pageNumberFromQueryParams, storePageNumber} from "../utils/Pagination";
import {useNavigate} from "react-router-dom";
import ArrowDown from "@surfnet/sds/icons/functional-icons/arrow-down-2.svg";
import ArrowUp from "@surfnet/sds/icons/functional-icons/arrow-up-2.svg";


export const Entities = ({
                             modelName,
                             showNew,
                             newLabel,
                             columns,
                             children,
                             loading,
                             actions,
                             title,
                             filters,
                             rowLinkMapper,
                             rowOverrideClickable = null,
                             tableClassName,
                             className = "",
                             hideTitle,
                             onHover,
                             actionHeader = "",
                             totalElements = null,
                             showActionsAlways,
                             displaySearch = true,
                             searchCallback,
                             customSearch,
                             entities,
                             searchAttributes,
                             newEntityPath,
                             newEntityFunc,
                             defaultSort,
                             rowClassNameResolver,
                             inputFocus = false,
                             notAllowedTitle = ""
                         }) => {

    const [query, setQuery] = useState("");
    const [sorted, setSorted] = useState(defaultSort);
    const [reverse, setReverse] = useState(false);
    const [page, setPage] = useState(pageNumberFromQueryParams());

    const searchRef = useRef();
    const navigate = useNavigate();

    useEffect(() => {
        if ((displaySearch || inputFocus) && searchRef && searchRef.current) {
            searchRef.current.focus();
        }
    }, [displaySearch, inputFocus, loading])

    const newEntity = () => {
        if (newEntityFunc) {
            newEntityFunc();
        } else {
            navigate(newEntityPath);
        }
    };

    const headerIcon = (column, sorted, reverse) => {
        if (column.nonSortable) {
            return null;
        }
        if (column.key === sorted) {
            return reverse ? <ArrowDown/> : <ArrowUp/>;
        }
        return null;
    }

    const queryChanged = e => {
        const newQuery = e.target.value;
        const currentQuery = query;
        setQuery(newQuery);
        //When the user change the query text we reset the page number
        const queryChanged = currentQuery !== newQuery;
        if (queryChanged) {
            setPage(1);
        }
        callCustomSearch(newQuery, sorted, reverse, queryChanged ? 1 : page);
    }

    const renderSearch = () => {
        const filterClassName = (!hideTitle && filters) ? "filters-with-title" : `${modelName}-search-filters`;
        return (
            <section className={`entities-search ${showNew ? "" : "only-search"}`}>
                <div className={`search ${showNew ? "" : "standalone"}`}>
                    {(!isEmpty(searchAttributes) || customSearch) &&
                        <div className={"sds--text-field sds--text-field--has-icon"}>
                            <div className="sds--text-field--shape">
                                <div className="sds--text-field--input-and-icon">
                                    <input className={"sds--text-field--input"}
                                           type="search"
                                           ref={searchRef}
                                           onChange={queryChanged}
                                           value={query}
                                           placeholder={I18n.t(`${modelName}.searchPlaceHolder`)}/>
                                    <span className="sds--text-field--icon">
                                    <SearchIcon/>
                                </span>
                                </div>
                            </div>
                        </div>}
                </div>
                {!isEmpty(filters) && <div className={`${filterClassName} search-filter`}>{filters}</div>}
                {showNew &&
                    <Button onClick={newEntity}
                            type={ButtonType.Primary}
                            className={`${hideTitle && !filters ? "no-title" : ""}`}
                            txt={newLabel || I18n.t(`${modelName}.new`)}/>
                }
            </section>
        );
    };

    const filterEntities = newQuery => {
        if (isEmpty(newQuery) || customSearch) {
            return entities;
        }
        const queryLower = newQuery.toLowerCase();
        return entities.filter(entity => searchAttributes.some(attr => {
            const val = valueForSort(attr, entity);
            return (isEmpty(val) || typeof val !== "string" || val.toLowerCase === undefined) ? false : val.toLowerCase().indexOf(queryLower) > -1;
        }));
    };

    const setSortedKey = key => {
        const newReserve = (sorted === key ? !reverse : false);
        setSorted(key);
        setReverse(newReserve);
        callCustomSearch(query, key, newReserve, page);
    }

    const callCustomSearch = (newQuery, newSorted, newReversed, newPage) => {
        if (customSearch) {
            //Adjust page, as serverSide is zero-based
            customSearch(newQuery, newSorted, newReversed, newPage - 1);
        }
        if (searchCallback) {
            const searchResult = filterEntities(query);
            searchCallback(searchResult);
        }
    }

    const getEntityValue = (entity, column) => {
        if (column.mapper) {
            return column.mapper(entity);
        }
        return entity[column.key];
    }

    const onRowClick = (e, entity) => {
        if (typeof rowLinkMapper === "function") {
            rowLinkMapper(e, entity);
        }
    }

    const entityRow = (entity, index) => {
        const additionalClassName = isEmpty(rowClassNameResolver) ? "" : rowClassNameResolver(entity);
        const overrideClickable = typeof rowOverrideClickable === "function" && rowOverrideClickable(entity);
        const clickAble = (!overrideClickable && typeof rowLinkMapper === "function") ? "clickable" : "";
        return <tr key={`tr_${entity.id}_${index}`}
                   title={overrideClickable && notAllowedTitle ? notAllowedTitle : ""}
                   className={`${clickAble} ${onHover ? "hoverable" : ""} ${additionalClassName} ${overrideClickable ? "not-allowed" : ""}`}>
            {columns.map((column, i) =>
                <td key={`td_${column.key}_${i}`}
                    onClick={e => (column.key !== "check" && !column.hasLink) ?
                        onRowClick(e, entity) : undefined}
                    data-label={typeof column === "string" ? column.header : ""}
                    className={`${column.key} ${column.nonSortable ? "" : "sortable"} ${column.className ? column.className : ""}`}>
                    {getEntityValue(entity, column)}
                </td>)}
        </tr>;
    }

    const renderEntities = sortedEntities => {
        const hasEntities = !isEmpty(sortedEntities);
        const total = sortedEntities.length;
        const minimalPage = Math.min(page, Math.ceil(sortedEntities.length / pageCount));
        sortedEntities = sortedEntities.slice((minimalPage - 1) * pageCount, minimalPage * pageCount);
        return (
            <section className="entities-list">
                {(actions && (showActionsAlways || hasEntities)) && <div className={`actions-header ${actionHeader}`}>
                    {actions}
                </div>}
                {hasEntities &&
                    <div className={"sds--table"}>
                        <table className={tableClassName || modelName}>
                            <thead>
                            <tr>
                                {columns.map((column, i) => {
                                    const showHeader = !actions || i < 1 || column.showHeader;
                                    return <th key={`th_${column.key}_${i}`}
                                               className={`${column.key} ${column.class || ""} ${column.nonSortable ? "" : "sortable"} ${showHeader ? "" : "hide"}`}
                                               onClick={() => !column.nonSortable && setSortedKey(column.key)}>
                                        {column.header}
                                        {column.toolTip && <Tooltip tip={column.toolTip}/>}
                                        {headerIcon(column, sorted, reverse)}
                                    </th>
                                })}
                            </tr>
                            </thead>
                            <tbody>
                            {sortedEntities.map((entity, index) =>
                                entityRow(entity, index)
                            )}
                            </tbody>
                        </table>
                    </div>}
                <Pagination currentPage={page}
                            onChange={nbr => {
                                setPage(nbr);
                                callCustomSearch(query, sorted, reverse, nbr);
                                storePageNumber(nbr);
                            }}
                            total={totalElements || total}
                            pageCount={pageCount}/>
            </section>
        );
    };

    if (loading) {
        return <Loader/>;
    }
    const filteredEntities = filterEntities(query);
    const sortedEntities = customSearch ? filteredEntities : sortObjects(filteredEntities, sorted, reverse);
    return (
        <div className={`mod-entities ${className}`}>
            {(!hideTitle) &&
                <h3>{title || `${I18n.t(`${modelName}.title`)} (${(totalElements || entities.length).toLocaleString()})`}</h3>}
            {displaySearch && renderSearch()}
            {renderEntities(sortedEntities)}
            <div>{children}</div>
        </div>);
}
