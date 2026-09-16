import {AppCustomization} from "../contexts/CustomizationContext";
import {appCustomization as defaultAppCustomization} from "./defaultCustomApp";

const overrides = import.meta.glob("./myCustomizations/index.ts", {eager: true}) as
    Record<string, { appCustomization: AppCustomization }>;

export const appCustomization: AppCustomization =
    overrides["./myCustomizations/index.ts"]?.appCustomization ?? defaultAppCustomization;
