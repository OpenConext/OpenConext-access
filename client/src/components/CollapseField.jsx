import {useState} from "react";
import "./CollapseField.scss"
import CaretUp from "../icons/caret_up.svg";
import CaretDown from "../icons/caret_down.svg";
import {Checkbox} from "@surfnet/curve-react";
import DOMPurify from "dompurify";

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
                {checkRequired && <Checkbox id={name}
                                            checked={checkValue}
                                            onCheckedChange={checked => checkRequired({target: {checked}})}
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
                                      dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(info)}}/>}
            {(collapse && !info) && <div className="collapsed">
                {children}
            </div>}
        </div>
    );
}
