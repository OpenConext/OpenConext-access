import React from "react";
import "./ToggleSegmentButton.scss";

export default function ToggleSegmentButton({value, options = [], onChange}) {
    return (
        <div className="toggle">
            {options.map(opt => {
                const isActive = value === opt.value;
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange && onChange(opt.value)}
                        className={`toggle__option ${isActive ? " active" : ""}`}>
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

