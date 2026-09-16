import {createContext, FC, ReactNode, useContext} from "react";

export type AppCustomization = {
    logo: ReactNode | string; // string for demo-purposes, later a nice to have as URL
}

export const AppCustomizationContext = createContext<AppCustomization>({
    logo: '[CustomLogo-DefaultFromContext]'
});

export type CustomizationContextProps = AppCustomization & {
    children: ReactNode;
}

export const CustomizationContextProvider: FC<CustomizationContextProps> = ({logo,children}) => {
    return (
        <AppCustomizationContext.Provider value={{ logo }}>
            {children}
        </AppCustomizationContext.Provider>
    );
}

export const useCustomization = () => {
    const { logo } = useContext(AppCustomizationContext);

    return {
        logo,
    }
}
