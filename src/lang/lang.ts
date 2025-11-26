import { moment } from 'obsidian';
import en from './locales/en';
import pt from './locales/pt';
import pt from './locales/ru';

// --- Global State ---

let userLanguage = 'auto';

export function setLanguage(lang: string) {
    userLanguage = lang;
}

// --- Translation Helper ---

export function t(key: keyof typeof en): string {
    let current = userLanguage;

    if (current === 'auto') {
        // @ts-ignore
        current = moment.locale(); 
    }

    if (current && current.toLowerCase().startsWith('pt')) {
        // @ts-ignore
        return pt[key] || en[key];
    }

    return en[key];
}
