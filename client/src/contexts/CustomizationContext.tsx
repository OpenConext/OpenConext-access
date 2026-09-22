import {createContext, FC, ReactNode, useContext} from "react";

export type AppCustomization = {
    logoPublic: ReactNode;
    logoLoggedIn: ReactNode;
}

export const AppCustomizationContext = createContext<AppCustomization>({
    logoPublic: <></>,
    logoLoggedIn: <></>,
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

// Hook
export const useCustomization = () => useContext(AppCustomizationContext)

// Helper component to avoid inline null-coalescing in JSX: { myOverride ?? <DefaultComponent /> }
type KeysOfType<T, V> = { [K in keyof T]: T[K] extends V ? K : never }[keyof T];

export type OverridableComponentProps = {
    appCustomizationReactNodeKey: KeysOfType<AppCustomization, ReactNode>
    children: ReactNode
}

export const OverridableComponent: React.FC<OverridableComponentProps> = ({ appCustomizationReactNodeKey, children}) => {
    const comp = useCustomization()[appCustomizationReactNodeKey];

    return comp ?? children;
}
