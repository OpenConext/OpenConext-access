import {createContext, FC, ReactNode, useContext} from "react";

export type AppCustomization = {
    logo: ReactNode | string; // string for demo-purposes, later a nice to have as URL
}

export const AppCustomizationContext = createContext<AppCustomization>({
    logo: '[CustomLogo-DefaultFromContext]'
});

export type CustomizationContextProps = {
    appCustomization: AppCustomization;
    children: ReactNode;
}

export const CustomizationContextProvider: FC<CustomizationContextProps> = ({children, appCustomization}) => {
    return (
        <AppCustomizationContext.Provider value={appCustomization}>
            {children}
        </AppCustomizationContext.Provider>
    );
}

export const useCustomization = () => useContext(AppCustomizationContext)
