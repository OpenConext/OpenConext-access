import {createContext, FC, ReactNode, useContext} from "react";

export type AppCustomization = {
    logoPublic: ReactNode | string; // string for demo-purposes, later a nice to have as URL
    logoLoggedIn: ReactNode | string;
}

export const AppCustomizationContext = createContext<AppCustomization>({
    logoPublic: '[CustomLogo-DefaultFromContext]',
    logoLoggedIn: '[CustomLoggedInLogo-DefaultFromContext]',
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
