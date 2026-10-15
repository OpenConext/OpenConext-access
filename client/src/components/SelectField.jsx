import React, {useState} from "react";

import "./SelectField.scss";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import {Tooltip, TooltipContent, TooltipTrigger} from "@surfnet/curve-react";
import {CheckIcon, InfoIcon, WarningIcon as AlertIcon} from "@phosphor-icons/react";
import I18n from "../locale/I18n.js";
import DOMPurify from "dompurify";

export default function SelectField({
                                        onChange, name, value, options, placeholder = "", disabled = false,
                                        toolTip = null, searchable = false, small = false,
                                        clearable = false, isMulti = false, creatable = false,
                                        onInputChange = null, required = false, info = null,
                                        className = "", isAlert = false, optional = false,
                                        infoUnderLabel = false, showCheck = false
                                    }) {
    const [inputValue, setInputValue] = useState("");

    // A typed value is added when the field loses focus, otherwise it is lost when clicking elsewhere
    const addTypedValueOnBlur = () => {
        const typed = inputValue.trim();
        if (typed) {
            const current = value || [];
            if (!current.some(option => option.value === typed)) {
                onChange([...current, {value: typed, label: typed, __isNew__: true}]);
            }
            setInputValue("");
        }
    }

    const onCreatableInputChange = (newValue, actionMeta) => {
        // Keep the typed text on blur / menu close; it is handled by addTypedValueOnBlur
        if (actionMeta.action === "input-change") {
            setInputValue(newValue);
        } else if (actionMeta.action === "set-value") {
            setInputValue("");
        }
        onInputChange && onInputChange(newValue, actionMeta);
    }

    // Options may carry a `description`, which is shown below the label in the menu only.
    // With `showCheck` the selected option is marked with a check in the menu.
    const formatOptionLabel = (option, {context, selectValue}) => {
        if (context !== "menu" || !(option.description || showCheck)) {
            return option.label;
        }
        const selected = showCheck && selectValue.some(selectedOption => selectedOption.value === option.value);
        return (
            <div className="option-with-description">
                <span className="option-text">
                    <span className="option-label">{option.label}</span>
                    {option.description && <span className="option-description">{option.description}</span>}
                </span>
                {selected && <CheckIcon/>}
            </div>
        );
    }

    const infoElement = info && <p className={`select-info ${infoUnderLabel ? "under-label" : ""}`}
                                   dangerouslySetInnerHTML={{
                                       __html: DOMPurify.sanitize(info
                                           , {ADD_ATTR: ["target"], ADD_TAGS: ["a", "rel"]})
                                   }}/>;
    return (
        <div className={`select-field ${className}`}>
            {name && <label htmlFor={name}>{name}
                {optional && <span className="optional">{I18n.t("forms.optional")}</span>}
                {toolTip && <Tooltip>
                    <TooltipTrigger render={<InfoIcon/>}/>
                    <TooltipContent><span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(toolTip)}}/></TooltipContent>
                </Tooltip>}
                {isAlert && <Tooltip>
                    <TooltipTrigger render={<AlertIcon weight="fill" className="alert-triangle"/>}/>
                    <TooltipContent><span dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(I18n.t("forms.changeRequest"))}}/></TooltipContent>
                </Tooltip>}
            </label>}
            {infoUnderLabel && infoElement}
            {creatable &&
                <CreatableSelect
                    className={`input-select-inner creatable`}
                    classNamePrefix={"select-inner"}
                    value={value}
                    isMulti={true}
                    placeholder={placeholder}
                    isSearchable={true}
                    inputValue={inputValue}
                    onInputChange={onCreatableInputChange}
                    onBlur={addTypedValueOnBlur}
                    formatCreateLabel={input => I18n.t("forms.createOption", {value: input})}
                    isClearable={clearable}
                    isDisabled={disabled}
                    onChange={onChange}
                    options={options}
                    required={required}
                />}
            {!creatable && <Select
                className={`input-select-inner ${small ? " small" : ""}`}
                classNamePrefix={"select-inner"}
                value={value}
                placeholder={placeholder}
                isDisabled={disabled}
                onChange={onChange}
                isMulti={isMulti}
                options={options}
                isSearchable={searchable}
                isClearable={clearable}
                required={required}
                formatOptionLabel={formatOptionLabel}
            />}
            {!infoUnderLabel && infoElement}
        </div>
    );
}
