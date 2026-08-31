import React from "react";
import "./PeriodPicker.scss";
import {Button} from "@surfnet/curve-react";
import {CaretLeftIcon as ArrowLeft, CaretRightIcon as ArrowRight} from "@phosphor-icons/react";
import {sanitize} from "../utils/Utils";

const PeriodPicker = ({value, onClick}) => {
    const currentYear = new Date().getFullYear();
    const atCurrentYear = value >= currentYear;

    return (
        <div className="access-period-picker-container">
            <div className="access-period-picker">
                <Button onClick={() => onClick(value - 1)}
                        variant="secondary">
                    <span data-icon="inline-end"><ArrowLeft/></span>
                </Button>
                <Button aria-expanded={true}
                        disabled={true}
                        variant="secondary">
                    <span dangerouslySetInnerHTML={{__html: sanitize(value)}}/>
                </Button>
                <Button onClick={atCurrentYear ? undefined : () => onClick(value + 1)}
                        disabled={atCurrentYear}
                        variant="secondary">
                    <span data-icon="inline-end"><ArrowRight/></span>
                </Button>
            </div>

        </div>)
};

export default PeriodPicker;
