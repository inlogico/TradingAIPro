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
    if (!data) {
        Logger.warn('validateTechnicalData: dati mancanti');
        return false;
    }
    
    // Se i dati sono un array (caso API)
    if (Array.isArray(data)) {
        if (data.length === 0) {
            Logger.warn('validateTechnicalData: array vuoto');
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
    } 
    // Se è un oggetto di indicatori tecnici (caso oggetto elaborato)
    else if (typeof data === 'object') {
        if (!data.priceData || !data.priceData.current) {
            Logger.warn('validateTechnicalData: dati di prezzo mancanti');
            return false;
        }
    } else {
        Logger.warn('validateTechnicalData: formato non valido');
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
 * Valida i dati dell'ordine generato
 * @param {Object} order - Dati dell'ordine
 * @returns {boolean} - true se i dati sono validi
 */
export function validateOrderData(order) {
    if (!order) {
        Logger.warn('validateOrderData: dati mancanti');
        return false;
    }
    
    // Verifica che ci siano tutti i campi essenziali
    if (!order.symbol || !order.orderType || !order.entryPrice || 
        !order.stopLoss || !order.targetPrice || !order.positionSize) {
        Logger.warn('validateOrderData: campi essenziali mancanti', {order});
        return false;
    }
    
    // Verifica la validità dei prezzi
    if (isNaN(order.entryPrice) || isNaN(order.stopLoss) || isNaN(order.targetPrice)) {
        Logger.warn('validateOrderData: prezzi non validi', {order});
        return false;
    }
    
    // Verifica la validità della size
    if (isNaN(order.positionSize) || order.positionSize <= 0) {
        Logger.warn('validateOrderData: size non valida', {order});
        return false;
    }
    
    // Verifica coerenza di entrata e stop loss
    if ((order.orderType === 'BUY' && order.stopLoss >= order.entryPrice) ||
        (order.orderType === 'SELL' && order.stopLoss <= order.entryPrice)) {
        Logger.warn('validateOrderData: stop loss incoerente con il tipo di ordine', {order});
        return false;
    }
    
    return true;
}
