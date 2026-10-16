import {useAppStore} from "../stores/AppStore.js";
import {parseUsedLanguages} from "../utils/Language.js";

export const useUsedLanguages = () => {
    const usedLanguages = useAppStore(state => state.config.usedLanguages);
    return parseUsedLanguages(usedLanguages);
};
