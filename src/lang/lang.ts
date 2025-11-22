import { moment } from 'obsidian';
import en from './locales/en';
import pt_br from './locales/pt-br';

// Estado global do idioma
let userLanguage = 'auto';

// Função para o Main.ts definir o idioma escolhido
export function setLanguage(lang: string) {
    userLanguage = lang;
}

export function t(key: keyof typeof en): string {
    let current = userLanguage;

    // Se for 'auto', perguntamos ao Obsidian qual a língua
    if (current === 'auto') {
        // @ts-ignore
        current = moment.locale(); 
    }

    // Detecção de Português
    if (current && current.toLowerCase().startsWith('pt_br')) {
        // @ts-ignore
        return pt_br[key] || en[key];
    }

    // Padrão: Inglês
    return en[key];
}