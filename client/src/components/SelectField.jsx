import React from "react";

import "./SelectField.scss";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import {Tooltip} from "@surfnet/sds";
import AlertIcon from "../icons/alert-triangle.svg";
import I18n from "../locale/I18n.js";

export default function SelectField({
                                        onChange, name, value, options, placeholder = "", disabled = false,
                                        toolTip = null, searchable = false, small = false,
                                        clearable = false, isMulti = false, creatable = false,
                                        onInputChange = null, required = false, info = null,
                                        className = "", isAlert = false
                                    }) {
    return (
        <div className={`select-field ${className}`}>
            {name && <label htmlFor={name}>{name}{required && <sup className="required">*</sup>}
                {toolTip && <Tooltip tip={toolTip}/>}
                {isAlert && <Tooltip standalone={true}
                                     children={<AlertIcon/>}
                                     tip={I18n.t("forms.changeRequest")}/>}
            </label>}
            {creatable &&
                <CreatableSelect
                    className={`input-select-inner creatable`}
                    classNamePrefix={"select-inner"}
                    value={value}
                    isMulti={true}
                    placeholder={placeholder}
                    isSearchable={true}
                    onInputChange={onInputChange}
                    isClearable={clearable}
                    isDisabled={disabled}
                    onChange={onChange}
                    options={options}
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
            />}
            {info && <p className="select-info">{info}</p>}
        </div>
    );
}
