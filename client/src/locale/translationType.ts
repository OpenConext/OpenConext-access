export type AppLanguage = {
    language: string;
    en: string;
    nl: string;
    [key: string]: string;
};

export type AppTranslation = {
    code: string;
    languages: AppLanguage;
    [key: string]: string | Record<string, unknown>;
};

export type AppTranslationOverride = {
    code: string;
    languages: Partial<AppLanguage>;
    [key: string]: string | Record<string, unknown>;
}
