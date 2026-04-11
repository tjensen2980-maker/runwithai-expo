import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import da from './locales/da.json';
import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import sv from './locales/sv.json';
import fi from './locales/fi.json';
import el from './locales/el.json';
import cs from './locales/cs.json';
import ro from './locales/ro.json';
import hu from './locales/hu.json';
import bg from './locales/bg.json';
import hr from './locales/hr.json';
import sk from './locales/sk.json';
import sl from './locales/sl.json';
import lt from './locales/lt.json';
import lv from './locales/lv.json';
import et from './locales/et.json';
import ga from './locales/ga.json';
import mt from './locales/mt.json';

const resources = {
  da: { translation: da },
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  it: { translation: it },
  pt: { translation: pt },
  nl: { translation: nl },
  pl: { translation: pl },
  sv: { translation: sv },
  fi: { translation: fi },
  el: { translation: el },
  cs: { translation: cs },
  ro: { translation: ro },
  hu: { translation: hu },
  bg: { translation: bg },
  hr: { translation: hr },
  sk: { translation: sk },
  sl: { translation: sl },
  lt: { translation: lt },
  lv: { translation: lv },
  et: { translation: et },
  ga: { translation: ga },
  mt: { translation: mt },
};

const supportedLanguages = Object.keys(resources);

export const languageReady = (async () => {
  let lng = 'en';
  try {
    const saved = await AsyncStorage.getItem('userLanguage');
    if (saved && supportedLanguages.includes(saved)) {
      lng = saved;
    } else {
      const deviceLang = Localization.getLocales()?.[0]?.languageCode || 'en';
      lng = supportedLanguages.includes(deviceLang) ? deviceLang : 'en';
    }
  } catch (e) {
    console.log('Language load error:', e);
  }

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
})();

export default i18n;
