import {useState} from "react";
import "./CollapseField.scss"
import CaretUp from "../icons/caret_up.svg";
import CaretDown from "../icons/caret_down.svg";
import {Checkbox} from "@surfnet/sds";

export const CollapseField = ({title, info, children, disabledToggle, checkRequired, name, checkValue}) => {

    const [collapse, setCollapse] = useState(false)

    const onCollapseToggle = () => {
        if (!disabledToggle) {
            setCollapse(!collapse)
        } else {
            checkRequired({target: {checked: !checkValue}});
        }
    }

    return (
        <div className="collapse-field" key={name}>
            <div className="collapse-field-inner">
                {checkRequired && <Checkbox name={name}
                                            value={checkValue}
                                            onChange={e => checkRequired(e)}
                />}
                <div className={`collapse-field-switch ${disabledToggle ? "disabled" : ""}`}
                     onClick={onCollapseToggle}>
                    <span className={`${collapse ? "collapsed" : "open"}`}>
                        {title}
                    </span>

                    {disabledToggle ? null : collapse ? <CaretUp/> : <CaretDown/>}
                </div>

            </div>
            {(collapse && info) && <p className="collapsed"
                                      dangerouslySetInnerHTML={{__html: info}}/>}
            {(collapse && !info) && <div className="collapsed">
                {children}
            </div>}
        </div>
    );
}
