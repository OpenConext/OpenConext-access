import {createRoot} from 'react-dom/client'
import App from './App.jsx'
import {BrowserRouter, Route, Routes} from "react-router";
import '@surfnet/curve-react/styles.css';
import './index.scss';
import './sds-overrides.scss'
import {StrictMode} from "react";
import {Toaster, TooltipProvider} from "@surfnet/curve-react";

const root = createRoot(document.getElementById("root"));
root.render(
    <StrictMode>
        <TooltipProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/*" element={<App/>}/>
                </Routes>
            </BrowserRouter>
            <Toaster/>
        </TooltipProvider>
    </StrictMode>
);
