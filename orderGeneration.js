/**
 * Modulo per la generazione di ordini MT4 basati sull'analisi tecnica e AI
 * Converte le raccomandazioni in formato eseguibile su MT4 considerando il profilo di trading
 */

import { CONFIG } from './config.js';
import { calculateOptimalStopLoss, calculateOptimalTargetPrice, calculateRiskRewardRatio } from './supportUtils.js';
import { getMoneyManagementSettings, calculatePositionSize } from './moneyManagement.js';

/**
 * Genera un ordine MT4 completo basato sull'analisi tecnica e AI
 * @param {Object} analysisData - Dati completi dell'analisi
 * @param {string} recommendation - Raccomandazione generata dall'AI
 * @param {Object} accountInfo - Informazioni sul conto di trading
 * @returns {Object} - Struttura completa dell'ordine
 */
function generateMT4Order(analysisData, recommendation, accountInfo) {
    const { symbol, companyInfo, technicalIndicators, tradingProfile } = analysisData;
    
    // Determina la direzione dell'operazione
    const orderType = determineOrderType(recommendation);
    
    // Se non c'è una direzione chiara, non generare l'ordine
    if (!orderType) {
        return {
            valid: false,
            message: "Nessun ordine generato: la raccomandazione non indica una direzione chiara."
        };
    }
    
    // Ottieni il prezzo di entrata ottimale
    const entryPrice = calculateEntryPrice(technicalIndicators, orderType, tradingProfile.name);
    
    // Calcola stop loss e target price
    const stopLoss = calculateOptimalStopLoss(
        technicalIndicators, 
        orderType === 'BUY' ? 'long' : 'short', 
        tradingProfile.name
    );
    
    const targetResult = calculateOptimalTargetPrice(
        technicalIndicators, 
        orderType === 'BUY' ? 'long' : 'short',
        tradingProfile.name
    );
    
    const targetPrice = targetResult ? targetResult.value : null;
    
    // Verifica validità di entrata, stop loss e target
    if (!entryPrice || !stopLoss || !targetPrice) {
        return {
            valid: false,
            message: "Impossibile generare l'ordine: livelli di prezzo non validi."
        };
    }
    
    // Calcola il rapporto rischio/rendimento
    const riskRewardRatio = calculateRiskRewardRatio(
        entryPrice, 
        targetPrice, 
        stopLoss
    );
    
    // Verifica che il rapporto rischio/rendimento sia accettabile
    const minimumRR = getMinimumRiskRewardRatio(tradingProfile.name);
    if (riskRewardRatio < minimumRR) {
        return {
            valid: false,
            message: `Rapporto rischio/rendimento ${riskRewardRatio.toFixed(2)} inferiore al minimo richiesto (${minimumRR}).`
        };
    }
    
    // Calcola la dimensione della posizione usando il modulo di money management
    const risk = Math.abs(entryPrice - stopLoss) / entryPrice;
    const moneySettings = getMoneyManagementSettings(accountInfo, tradingProfile.name);
    const positionSize = calculatePositionSize(
        accountInfo.balance,
        risk,
        moneySettings.riskPerTrade,
        technicalIndicators.volatility.value
    );
    
    // Calcola la data di scadenza dell'ordine in base al profilo di trading
    const expiryDate = calculateOrderExpiry(tradingProfile.name);
    
    // Genera l'oggetto ordine completo
    const order = {
        valid: true,
        symbol: symbol,
        orderType: orderType,
        entryPrice: entryPrice,
        stopLoss: stopLoss,
        targetPrice: targetPrice,
        positionSize: positionSize,
        riskRewardRatio: riskRewardRatio,
        expiryDate: expiryDate,
        confidence: getConfidenceLevel(recommendation),
        tradingProfile: tradingProfile.name,
        tradingProfileIcon: tradingProfile.icon,
        commentMT4: generateOrderComment(symbol, tradingProfile.name, recommendation),
        mt4Command: generateMT4Command(
            symbol, 
            orderType, 
            entryPrice, 
            stopLoss, 
            targetPrice, 
            positionSize
        ),
        description: `${orderType === 'BUY' ? 'Acquisto' : 'Vendita'} di ${symbol} a $${entryPrice.toFixed(2)} con stop loss a $${stopLoss.toFixed(2)} e target a $${targetPrice.toFixed(2)}. R/R: ${riskRewardRatio.toFixed(2)}.`
    };
    
    return order;
}

/**
 * Determina il tipo di ordine in base alla raccomandazione
 * @param {string} recommendation - Raccomandazione generata dall'AI
 * @returns {string|null} - Tipo di ordine ('BUY', 'SELL' o null)
 */
function determineOrderType(recommendation) {
    if (!recommendation) return null;
    
    const rec = recommendation.toLowerCase();
    
    if (rec.includes('compra')) {
        return 'BUY';
    } else if (rec.includes('vendi')) {
        return 'SELL';
    } else {
        // Se è "Mantieni" o altro, non generare un ordine
        return null;
    }
}

/**
 * Calcola il prezzo di entrata ottimale in base all'analisi
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @param {string} orderType - Tipo di ordine ('BUY' o 'SELL')
 * @param {string} profileName - Nome del profilo di trading
 * @returns {number|null} - Prezzo di entrata o null se non determinabile
 */
function calculateEntryPrice(technicalIndicators, orderType, profileName) {
    const currentPrice = technicalIndicators.priceData.current;
    
    // Approccio base: usa il prezzo corrente
    let entryPrice = currentPrice;
    
    // Adatta l'entrata in base al profilo di trading
    const profile = profileName.toLowerCase().replace(/\s+/g, '');
    
    // Applica una logica diversa per ogni profilo di trading
    switch(profile) {
        case 'falcodelloscalping':
            // Per scalping, l'entrata è più aggressiva (vicino al prezzo corrente)
            // Per acquisti, leggermente sotto il corrente; per vendite, leggermente sopra
            const deviationScalp = currentPrice * 0.0015; // 0.15%
            entryPrice = orderType === 'BUY' 
                ? currentPrice - deviationScalp 
                : currentPrice + deviationScalp;
            break;
            
        case 'serpentedelloswingtrading':
        case 'serpenteoftheswingtrading':
        case 'swing':
            // Per swing trading, cerca punti di entrata più vantaggiosi
            // Attende un piccolo pullback (ritracciamento)
            const deviationSwing = currentPrice * 0.005; // 0.5%
            entryPrice = orderType === 'BUY' 
                ? currentPrice - deviationSwing 
                : currentPrice + deviationSwing;
            break;
            
        case 'orsodellpositiontrading':
        case 'orsodelpositiontrading':
        case 'position':
        case 'tartarugadell\'investimento':
        case 'tartarugadellinvestimento':
        case 'longterm':
            // Per position trading e investimenti a lungo termine
            // L'entrata è più conservativa, cercando un ritracciamento più significativo
            const deviationPosition = currentPrice * 0.01; // 1%
            entryPrice = orderType === 'BUY' 
                ? currentPrice - deviationPosition 
                : currentPrice + deviationPosition;
            break;
            
        default:
            // Usa un approccio moderato per profili non riconosciuti
            const deviationDefault = currentPrice * 0.003; // 0.3%
            entryPrice = orderType === 'BUY' 
                ? currentPrice - deviationDefault 
                : currentPrice + deviationDefault;
    }
    
    // Arrotonda il prezzo a 2 decimali per azioni
    return Math.round(entryPrice * 100) / 100;
}

/**
 * Calcola il rapporto rischio/rendimento minimo accettabile per un profilo
 * @param {string} profileName - Nome del profilo di trading
 * @returns {number} - Rapporto rischio/rendimento minimo
 */
function getMinimumRiskRewardRatio(profileName) {
    const profile = profileName.toLowerCase().replace(/\s+/g, '');
    
    switch(profile) {
        case 'falcodelloscalping':
            return 1.2; // Accetta R/R più bassi per operazioni rapide
        case 'serpentedelloswingtrading':
        case 'serpenteoftheswingtrading':
        case 'swing':
            return 1.5; // R/R standard per swing trading
        case 'orsodellpositiontrading':
        case 'orsodelpositiontrading':
        case 'position':
            return 2.0; // Richiede R/R più alto per position trading
        case 'tartarugadell\'investimento':
        case 'tartarugadellinvestimento':
        case 'longterm':
            return 2.5; // R/R molto alto per investimenti a lungo termine
        default:
            return 1.5; // Valore predefinito
    }
}

/**
 * Calcola la data di scadenza dell'ordine in base al profilo di trading
 * @param {string} profileName - Nome del profilo di trading
 * @returns {Date} - Data e ora di scadenza dell'ordine
 */
function calculateOrderExpiry(profileName) {
    const now = new Date();
    const profile = profileName.toLowerCase().replace(/\s+/g, '');
    
    switch(profile) {
        case 'falcodelloscalping':
            // Per scalping, scadenza dopo poche ore
            now.setHours(now.getHours() + 4);
            break;
        case 'serpentedelloswingtrading':
        case 'serpenteoftheswingtrading':
        case 'swing':
            // Per swing trading, scadenza dopo qualche giorno
            now.setDate(now.getDate() + 2);
            break;
        case 'orsodellpositiontrading':
        case 'orsodelpositiontrading':
        case 'position':
            // Per position trading, scadenza dopo una settimana
            now.setDate(now.getDate() + 7);
            break;
        case 'tartarugadell\'investimento':
        case 'tartarugadellinvestimento':
        case 'longterm':
            // Per investimenti a lungo termine, scadenza dopo un mese
            now.setMonth(now.getMonth() + 1);
            break;
        default:
            // Scadenza predefinita dopo 3 giorni
            now.setDate(now.getDate() + 3);
    }
    
    return now;
}

/**
 * Genera un commento per l'ordine MT4
 * @param {string} symbol - Simbolo dell'asset
 * @param {string} profileName - Nome del profilo di trading
 * @param {string} recommendation - Raccomandazione generata dall'AI
 * @returns {string} - Commento per l'ordine
 */
function generateOrderComment(symbol, profileName, recommendation) {
    const profile = profileName.toLowerCase().replace(/\s+/g, '');
    let profileCode;
    
    switch(profile) {
        case 'falcodelloscalping':
            profileCode = "SCA";
            break;
        case 'serpentedelloswingtrading':
        case 'serpenteoftheswingtrading':
        case 'swing':
            profileCode = "SWI";
            break;
        case 'orsodellpositiontrading':
        case 'orsodelpositiontrading':
        case 'position':
            profileCode = "POS";
            break;
        case 'tartarugadell\'investimento':
        case 'tartarugadellinvestimento':
        case 'longterm':
            profileCode = "LNG";
            break;
        default:
            profileCode = "STD";
    }
    
    // Crea un timestamp compatto
    const now = new Date();
    const timestamp = now.getFullYear().toString().slice(-2) + 
                     (now.getMonth() + 1).toString().padStart(2, '0') + 
                     now.getDate().toString().padStart(2, '0');
    
    // Aggiungi un codice di confidenza basato sulla raccomandazione
    const confidenceCode = recommendation.toLowerCase().includes('forte') ? 'H' : 'M';
    
    // Formato: SIMBOLO_PROFILO_DATA_CONFIDENZA
    return `${symbol}_${profileCode}_${timestamp}_${confidenceCode}`;
}

/**
 * Valuta il livello di confidenza della raccomandazione
 * @param {string} recommendation - Raccomandazione generata dall'AI
 * @returns {string} - Livello di confidenza (Alta, Media)
 */
function getConfidenceLevel(recommendation) {
    if (recommendation.toLowerCase().includes('forte')) {
        return 'Alta';
    } else {
        return 'Media';
    }
}

/**
 * Genera il comando MT4 per l'esecuzione dell'ordine
 * @param {string} symbol - Simbolo dell'asset
 * @param {string} orderType - Tipo di ordine ('BUY' o 'SELL')
 * @param {number} entryPrice - Prezzo di entrata
 * @param {number} stopLoss - Livello di stop loss
 * @param {number} targetPrice - Prezzo target
 * @param {number} positionSize - Dimensione della posizione
 * @returns {string} - Comando MT4 per l'esecuzione dell'ordine
 */
function generateMT4Command(symbol, orderType, entryPrice, stopLoss, targetPrice, positionSize) {
    const orderTypeMT4 = orderType === 'BUY' ? 'OP_BUYLIMIT' : 'OP_SELLLIMIT';
    
    // Formato del comando standard MT4 per ordini pendenti
    const command = `OrderSend("${symbol}", ${orderTypeMT4}, ${positionSize.toFixed(2)}, ${entryPrice.toFixed(2)}, 3, ${stopLoss.toFixed(2)}, ${targetPrice.toFixed(2)}, "TradingAI", 12345, 0, Green);`;
    
    return command;
}

/**
 * Genera un riepilogo dell'ordine in formato testuale
 * @param {Object} order - Oggetto ordine completo
 * @returns {string} - Riepilogo testuale dell'ordine
 */
function generateOrderSummary(order) {
    if (!order.valid) {
        return `⚠️ ${order.message}`;
    }
    
    // Formatta la data di scadenza
    const expiryFormatted = order.expiryDate.toLocaleString('it-IT', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Crea un riepilogo formattato dell'ordine
    return `
📊 ORDINE MT4 GENERATO (${order.tradingProfileIcon} ${order.tradingProfile})

📈 ${order.orderType === 'BUY' ? 'ACQUISTO' : 'VENDITA'} ${order.symbol} (Confidenza: ${order.confidence})

💰 Dettagli Operazione:
   Prezzo di Entrata: $${order.entryPrice.toFixed(2)}
   Stop Loss: $${order.stopLoss.toFixed(2)} (${(Math.abs(order.stopLoss - order.entryPrice) / order.entryPrice * 100).toFixed(2)}%)
   Target Price: $${order.targetPrice.toFixed(2)} (${(Math.abs(order.targetPrice - order.entryPrice) / order.entryPrice * 100).toFixed(2)}%)
   Rapporto Rischio/Rendimento: 1:${order.riskRewardRatio.toFixed(2)}

📉 Money Management:
   Volume: ${order.positionSize.toFixed(2)} unità/lotti

⏰ Scadenza Ordine: ${expiryFormatted}

💻 Comando MT4:
${order.mt4Command}
`;
}

// Esporta le funzioni
export {
    generateMT4Order,
    generateOrderSummary
};