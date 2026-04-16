import React from "react";
import "./PeriodPicker.scss";
import {Button, ButtonType} from "@surfnet/sds";
import ArrowLeft from "@surfnet/sds/icons/functional-icons/arrow-left-2.svg";
import ArrowRight from "@surfnet/sds/icons/functional-icons/arrow-right-2.svg";

const PeriodPicker = ({value, onClick}) => {

    return (
        <div className="access-period-picker-container">
            <div className="access-period-picker">
                <Button onClick={() => onClick(value - 1)}
                        icon={<ArrowLeft/>}
                        type={ButtonType.Secondary}/>
                <Button txt={value}
                        active={true}
                        disabled={true}
                        type={ButtonType.Secondary}/>
                <Button onClick={() => onClick(value + 1)}
                        type={ButtonType.Secondary}
                        icon={<ArrowRight/>}/>
            </div>

        </div>)
};

export default PeriodPicker;
