import React, {useEffect, useRef, useState} from "react";
import I18n from "../locale/I18n";
import {MagnifyingGlassIcon as SearchIcon} from "@phosphor-icons/react";
import {isEmpty, sanitize} from "../utils/Utils";
import {sortObjects, valueForSort} from "../utils/Sort";
import "./Entities.scss";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
    Spinner,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from "@surfnet/curve-react";
import {Button} from "@surfnet/curve-react";
import {pageCount, pageNumberFromQueryParams, pageRangeWithDots, storePageNumber} from "../utils/Pagination";
import {useNavigate} from "react-router";
import {CaretDownIcon as ArrowDown, CaretUpIcon as ArrowUp, CaretUpDownIcon, InfoIcon} from "@phosphor-icons/react";


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
        return <CaretUpDownIcon/>;
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
                        <InputGroup className="entities-search-input-group">
                            <InputGroupInput type="search"
                                             ref={searchRef}
                                             onChange={queryChanged}
                                             value={query}
                                             placeholder={I18n.t(`${modelName}.searchPlaceHolder`)}/>
                            <InputGroupAddon align="inline-end">
                                <SearchIcon/>
                            </InputGroupAddon>
                        </InputGroup>}
                </div>
                {!isEmpty(filters) && <div className={`${filterClassName} search-filter`}>{filters}</div>}
                {showNew &&
                    <Button onClick={newEntity}
                            className={`${hideTitle && !filters ? "no-title" : ""}`}>
                        <span dangerouslySetInnerHTML={{__html: sanitize(newLabel || I18n.t(`${modelName}.new`))}}/>
                    </Button>
                }
            </section>
        );
    };

    const filterEntities = newQuery => {
        if (isEmpty(newQuery) || customSearch) {
            return entities;
        }
        const queryLower = newQuery.toLowerCase().trim();
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
        return <TableRow key={`tr_${entity.id}_${index}`}
                   title={overrideClickable && notAllowedTitle ? notAllowedTitle : ""}
                   className={`${clickAble} ${onHover ? "hoverable" : ""} ${additionalClassName} ${overrideClickable ? "not-allowed" : ""}`}>
            {columns.map((column, i) =>
                <TableCell key={`td_${column.key}_${i}`}
                    onClick={e => (column.key !== "check" && !column.hasLink) ?
                        onRowClick(e, entity) : undefined}
                    data-label={typeof column === "string" ? column.header : ""}
                    className={`${column.key} ${column.nonSortable ? "" : "sortable"} ${column.className ? column.className : ""}`}>
                    {getEntityValue(entity, column)}
                </TableCell>)}
        </TableRow>;
    }

    const renderPagination = (total, onChange) => {
        const nbrPages = Math.ceil(total / pageCount);
        if (total <= pageCount) {
            return null;
        }
        return (
            <Pagination>
                <PaginationContent>
                    {page !== 1 && <PaginationItem>
                        <PaginationPrevious href="#" iconOnly={true}
                                            onClick={e => {
                                                e.preventDefault();
                                                onChange(page - 1);
                                            }}/>
                    </PaginationItem>}
                    {pageRangeWithDots(page, nbrPages).map((nbr, index) =>
                        <PaginationItem key={`${nbr}_${index}`}>
                            {typeof nbr === "string" ?
                                <PaginationEllipsis/> :
                                <PaginationLink href="#" isActive={nbr === page}
                                                aria-current={nbr === page ? "page" : undefined}
                                                onClick={e => {
                                                    e.preventDefault();
                                                    onChange(nbr);
                                                }}>{nbr}</PaginationLink>}
                        </PaginationItem>
                    )}
                    {page !== nbrPages && <PaginationItem>
                        <PaginationNext href="#" iconOnly={true}
                                        onClick={e => {
                                            e.preventDefault();
                                            onChange(page + 1);
                                        }}/>
                    </PaginationItem>}
                </PaginationContent>
            </Pagination>
        );
    };

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
                    <Table className={tableClassName || modelName}>
                        <TableHeader>
                        <TableRow>
                            {columns.map((column, i) => {
                                const showHeader = !actions || i < 1 || column.showHeader;
                                return <TableHead key={`th_${column.key}_${i}`}
                                           className={`${column.key} ${column.class || ""} ${column.nonSortable ? "" : "sortable"} ${showHeader ? "" : "hide"}`}
                                           onClick={() => !column.nonSortable && setSortedKey(column.key)}>
                                    <span className="th-content">
                                        {column.header}
                                        {column.toolTip && <Tooltip>
                                            <TooltipTrigger render={<InfoIcon/>}/>
                                            <TooltipContent><span dangerouslySetInnerHTML={{__html: sanitize(column.toolTip)}}/></TooltipContent>
                                        </Tooltip>}
                                        {headerIcon(column, sorted, reverse)}
                                    </span>
                                </TableHead>
                            })}
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {sortedEntities.map((entity, index) =>
                            entityRow(entity, index)
                        )}
                        </TableBody>
                    </Table>}
                {renderPagination(totalElements || total, nbr => {
                    setPage(nbr);
                    callCustomSearch(query, sorted, reverse, nbr);
                    storePageNumber(nbr);
                })}
            </section>
        );
    };

    if (loading) {
        return <div className="loading-container"><Spinner className="size-8"/></div>;
    }
    const filteredEntities = filterEntities(query);
    const sortedEntities = customSearch ? filteredEntities : sortObjects(filteredEntities, sorted, reverse);
    return (
        <div className={`mod-entities ${className}`}>
            {(!hideTitle) &&
                <h3 className="text-[length:var(--text-lg-font-size)]">{title || `${I18n.t(`${modelName}.title`)} (${(totalElements || entities.length).toLocaleString()})`}</h3>}
            {displaySearch && renderSearch()}
            {renderEntities(sortedEntities)}
            <div>{children}</div>
        </div>);
}
