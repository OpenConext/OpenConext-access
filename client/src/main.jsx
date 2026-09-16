import {createRoot} from 'react-dom/client'
import App from './App.jsx'
import {BrowserRouter, Route, Routes} from "react-router";
import '@surfnet/curve-react/styles.css';
import './tailwind.css';
import './index.scss';
import {StrictMode} from "react";
import {Toaster, TooltipProvider} from "@surfnet/curve-react";

import {CustomizationContextProvider} from "./contexts/CustomizationContext";
import {appCustomization} from "./appCustomizations";

const root = createRoot(document.getElementById("root"));
root.render(
    <StrictMode>
        <CustomizationContextProvider appCustomization={appCustomization}>
            <TooltipProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/*" element={<App/>}/>
                    </Routes>
                </BrowserRouter>
                <Toaster/>
            </TooltipProvider>
        </CustomizationContextProvider>
    </StrictMode>
);
