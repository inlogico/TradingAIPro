/**
 * Modulo per la validazione dei dati provenienti dalle API esterne
 * Implementa controlli per garantire la qualità e coerenza dei dati
 */

import Logger from './advanced-logger.js';

/**
 * Valida i dati del profilo dell'asset
 * @param {Object} data - Dati del profilo aziendale
 * @returns {boolean} - true se i dati sono validi
 */
export function validateAssetData(data) {
    if (!data) {
        Logger.warn('validateAssetData: dati mancanti');
        return false;
    }
    
    // Controlli essenziali
    if (!data.symbol || !data.companyName) {
        Logger.warn('validateAssetData: simbolo o nome società mancanti', {data});
        return false;
    }
    
    // Controlli opzionali con avvisi
    if (!data.sector) {
        Logger.warn('validateAssetData: settore mancante', {symbol: data.symbol});
    }
    
    if (!data.beta || isNaN(data.beta)) {
        Logger.warn('validateAssetData: beta mancante o non valido', {symbol: data.symbol});
    }
    
    if (!data.mktCap || isNaN(data.mktCap)) {
        Logger.warn('validateAssetData: capitalizzazione di mercato mancante o non valida', {symbol: data.symbol});
    }
    
    return true;
}

/**
 * Valida i dati tecnici
 * @param {Object} data - Dati tecnici dell'asset
 * @returns {boolean} - true se i dati sono validi
 */
export function validateTechnicalData(data) {
    if (!data || !Array.isArray(data) || data.length === 0) {
        Logger.warn('validateTechnicalData: dati mancanti o formato non valido');
        return false;
    }
    
    // Controllo che ci siano abbastanza dati per un'analisi significativa
    if (data.length < 10) {
        Logger.warn('validateTechnicalData: dati insufficienti per un\'analisi significativa', {count: data.length});
        return false;
    }
    
    // Controlla almeno un record per verificare la presenza di campi essenziali
    const sampleRecord = data[0];
    
    if (!sampleRecord.date) {
        Logger.warn('validateTechnicalData: campo data mancante', {sample: sampleRecord});
        return false;
    }
    
    // Se siamo qui, i dati sono sufficientemente validi
    return true;
}

/**
 * Valida i dati di sentiment
 * @param {Object} data - Dati di sentiment
 * @returns {boolean} - true se i dati sono validi
 */
export function validateSentimentData(data) {
    if (!data) {
        Logger.warn('validateSentimentData: dati mancanti');
        return false;
    }
    
    // Verifica che ci sia un sentiment composito
    if (!data.compositeSentiment) {
        Logger.warn('validateSentimentData: sentiment composito mancante', {data});
        return false;
    }
    
    // Verifica che ci siano dati degli analisti
    if (!data.analystRatings) {
        Logger.warn('validateSentimentData: dati degli analisti mancanti', {data});
        return false;
    }
    
    // Verifica che ci siano dati di sentiment news
    if (!data.newsSentiment) {
        Logger.warn('validateSentimentData: dati di sentiment news mancanti', {data});
        return false;
    }
    
    // Verifica che ci siano dati di sentiment social
    if (!data.socialSentiment) {
        Logger.warn('validateSentimentData: dati di sentiment social mancanti', {data});
        return false;
    }
    
    return true;
}

/**
 