import React from "react";
import "./ToggleSegmentButton.scss";

/**
 * Props:
 * - value: string (selected value)
 * - options: [{ value: string, label: string }, { value: string, label: string }]
 * - onChange: function(newValue)
 */
export default function ToggleSegmentButton({value, options = [], onChange}) {
    if (!options || options.length !== 2) {
        console.warn("ToggleSegmentButton expects exactly 2 options");
        return null;
    }

    return (
        <div className="toggle">
            {options.map((opt) => {
                const isActive = value === opt.value;

                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange && onChange(opt.value)}
                        className={`toggle__option ${isActive ? "toggle__option--active" : ""}`}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

