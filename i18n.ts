import i18next from "i18next";
import { initReactI18next, useTranslation as useTranslationOrg } from "react-i18next";
import enJSON from "./lang/EN.json";
import frJSON from "./lang/FR.json";
import deJSON from "./lang/DE.json";

i18next
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enJSON },
      fr: { translation: frJSON },
      de: { translation: deJSON },
    },
    lng: "fr", // default language
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false,
    },
  });

export const useTranslation = () => useTranslationOrg();
export { i18next };
