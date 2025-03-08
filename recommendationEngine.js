/**
 * Modulo per la generazione di raccomandazioni basate su indicatori tecnici
 * Implementa un motore di decisione ponderato per vari profili di trading
 */

/**
 * Calcola una raccomandazione di trading basata su un'analisi ponderata degli indicatori
 * @param {Object} technicalIndicators - Oggetto con tutti gli indicatori tecnici
 * @param {string} profileType - Tipo di profilo di trading
 * @returns {Object} - Oggetto con raccomandazione, punteggio e confidenza
 */
function calculateWeightedRecommendation(technicalIndicators, profileType = 'swing') {
    // Definisci i pesi per ciascun indicatore in base al profilo di trading
    let weights = getWeightsForProfile(profileType);
    
    // Calcola i segnali per ciascun indicatore
    const signals = {
        rsi: calculateRSISignal(technicalIndicators),
        macd: calculateMACDSignal(technicalIndicators),
        ema: calculateEMASignal(technicalIndicators),
        adx: calculateADXSignal(technicalIndicators),
        bollinger: calculateBollingerSignal(technicalIndicators),
        volume: calculateVolumeSignal(technicalIndicators),
        pattern: calculatePatternSignal(technicalIndicators)
    };
    
    // Calcola il punteggio ponderato totale
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    for (const indicator in weights) {
        if (signals[indicator] !== null) {
            totalScore += signals[indicator] * weights[indicator];
            maxPossibleScore += Math.abs(weights[indicator] * 2); // Assumendo un range di segnale da -2 a +2
        }
    }
    
    // Normalizza il punteggio su una scala da -10 a +10
    const normalizedScore = maxPossibleScore > 0 
        ? (totalScore / maxPossibleScore) * 10 
        : 0;
    
    // Determina la raccomandazione e la confidenza
    const recommendation = determineRecommendation(normalizedScore);
    const confidence = determineConfidence(normalizedScore, signals);
    
    // Visualizza informazioni di debug nella console per sviluppo
    console.log("Raccomandazione algoritmica:", {
        profile: profileType,
        signals,
        weights,
        totalScore,
        normalizedScore,
        recommendation,
        confidence
    });
    
    return {
        recommendation,
        score: normalizedScore.toFixed(2),
        confidence
    };
}

/**
 * Ottiene i pesi per ciascun indicatore in base al profilo
 * @param {string} profileType - Tipo di profilo di trading
 * @returns {Object} - Pesi per ogni indicatore
 */
function getWeightsForProfile(profileType) {
    // Normalizza il tipo di profilo per gestire varianti
    const profile = profileType.toLowerCase().replace(/\s+/g, '');
    
    switch(profile) {
        case "falcodelloscalping":
            return {
                rsi: 2.5,
                macd: 1.5,
                ema: 2.0,
                adx: 1.5,
                bollinger: 2.0,
                volume: 2.5,
                pattern: 1.0
            };
            
        case "serpentedelloswingtrading":
        case "serpenteoftheswingtrading":
        case "swing":
            return {
                rsi: 2.0,
                macd: 2.5,
                ema: 2.0,
                adx: 2.0,
                bollinger: 1.5,
                volume: 1.0,
                pattern: 2.0
            };
            
        case "orsodellpositiontrading":
        case "orsodelpositiontrading":
        case "position":
            return {
                rsi: 1.5,
                macd: 2.0,
                ema: 2.5,
                adx: 2.5,
                bollinger: 1.0,
                volume: 0.5,
                pattern: 1.5
            };
            
        case "tartarugadell'investimentoalungotermine":
        case "tartarugadell'investimento":
        case "tartarugadellinvestimento":
        case "longterm":
            return {
                rsi: 1.0,
                macd: 1.5,
                ema: 3.0,
                adx: 1.5,
                bollinger: 0.5,
                volume: 0.5,
                pattern: 1.0
            };
            
        default: // Profilo bilanciato predefinito
            return {
                rsi: 2.0,
                macd: 2.0,
                ema: 2.0,
                adx: 2.0,
                bollinger: 1.5,
                volume: 1.0,
                pattern: 1.5
            };
    }
}

/**
 * Calcola il segnale RSI
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @returns {number} - Segnale da -2 a +2
 */
function calculateRSISignal(technicalIndicators) {
    if (!technicalIndicators.momentum || technicalIndicators.momentum.rsi === null) return null;
    
    const rsi = technicalIndicators.momentum.rsi;
    
    // Analisi RSI con zone di transizione
    if (rsi > 75) return -2;
    if (rsi > 65) return -1;
    if (rsi < 25) return 2;
    if (rsi < 35) return 1;
    if (rsi > 60) return -0.5;
    if (rsi < 40) return 0.5;
    
    return 0; // Neutrale
}

/**
 * Calcola il segnale MACD
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @returns {number} - Segnale da -2 a +2
 */
function calculateMACDSignal(technicalIndicators) {
    if (!technicalIndicators.momentum || 
        technicalIndicators.momentum.macd === null || 
        technicalIndicators.momentum.macdSignal === null ||
        technicalIndicators.momentum.macdHistogram === null) return null;
    
    const macd = technicalIndicators.momentum.macd;
    const signal = technicalIndicators.momentum.macdSignal;
    const histogram = technicalIndicators.momentum.macdHistogram;
    
    // MACD sopra la linea di segnale (rialzista)
    if (macd > signal) {
        if (histogram > 0) {
            return histogram > Math.abs(macd * 0.1) ? 2 : 1;
        } 
        return 0.5;
    } 
    // MACD sotto la linea di segnale (ribassista)
    else {
        if (histogram < 0) {
            return histogram < -Math.abs(macd * 0.1) ? -2 : -1;
        }
        return -0.5;
    }
}

/**
 * Calcola il segnale EMA/SMA
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @returns {number} - Segnale da -2 a +2
 */
function calculateEMASignal(technicalIndicators) {
    if (!technicalIndicators.movingAverages) return null;
    
    const mas = technicalIndicators.movingAverages;
    const price = technicalIndicators.priceData?.current;
    
    if (!price) return null;
    
    let emaSignal = 0;
    let validIndicators = 0;
    
    // Verifica EMA vs SMA
    if (mas.ema20 !== null && mas.smaMedium !== null) {
        emaSignal += mas.ema20 > mas.smaMedium ? 1 : -1;
        validIndicators++;
    }
    
    // Verifica prezzo vs EMA
    if (mas.ema20 !== null) {
        emaSignal += price > mas.ema20 ? 1 : -1;
        validIndicators++;
    }
    
    // Verifica prezzo vs SMA lungo periodo
    if (mas.smaLong !== null) {
        emaSignal += price > mas.smaLong ? 0.5 : -0.5;
        validIndicators += 0.5;
    }
    
    // Verifica inclinazione delle MA (simulata)
    if (mas.ema20 !== null && mas.smaMedium !== null) {
        // Qui simulo l'inclinazione; in una implementazione reale si userebbe il confronto tra valori storici
        const ratio = mas.ema20 / mas.smaMedium;
        if (ratio > 1.005) emaSignal += 0.5;
        else if (ratio < 0.995) emaSignal -= 0.5;
        validIndicators += 0.5;
    }
    
    // Normalizza il segnale
    return validIndicators > 0 ? emaSignal / validIndicators : null;
}

/**
 * Calcola il segnale ADX
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @returns {number} - Segnale da -2 a +2
 */
function calculateADXSignal(technicalIndicators) {
    if (!technicalIndicators.trend || 
        technicalIndicators.trend.adx === null ||
        technicalIndicators.trend.plusDI === null ||
        technicalIndicators.trend.minusDI === null) return null;
    
    const adx = technicalIndicators.trend.adx;
    const plusDI = technicalIndicators.trend.plusDI;
    const minusDI = technicalIndicators.trend.minusDI;
    
    // Calcola la forza del trend
    let adxStrength;
    if (adx > 30) adxStrength = 2;
    else if (adx > 20) adxStrength = 1.5;
    else if (adx > 15) adxStrength = 1;
    else adxStrength = 0.5;
    
    // Determina la direzione del trend
    if (plusDI > minusDI) {
        return adxStrength;  // Trend rialzista
    } else if (plusDI < minusDI) {
        return -adxStrength; // Trend ribassista
    } else {
        return 0;           // Trend neutrale o assente
    }
}

/**
 * Calcola il segnale Bollinger
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @returns {number} - Segnale da -2 a +2
 */
function calculateBollingerSignal(technicalIndicators) {
    if (!technicalIndicators.volatility || 
        !technicalIndicators.volatility.bollingerUpper || 
        !technicalIndicators.volatility.bollingerLower ||
        !technicalIndicators.volatility.bollingerMiddle || 
        !technicalIndicators.priceData ||
        !technicalIndicators.priceData.current) return null;
    
    const price = technicalIndicators.priceData.current;
    const upper = technicalIndicators.volatility.bollingerUpper;
    const lower = technicalIndicators.volatility.bollingerLower;
    const middle = technicalIndicators.volatility.bollingerMiddle;
    
    // Prezzo oltre le bande esterne
    if (price > upper) {
        return -1.5;  // Forte ipercomprato
    } else if (price < lower) {
        return 1.5;   // Forte ipervenduto
    } 
    
    // Posizione all'interno delle bande
    const range = upper - lower;
    if (range === 0) return 0;
    
    const position = price - lower;
    const percentInBand = position / range;
    
    if (percentInBand > 0.85) return -1;      // Vicino alla banda superiore
    else if (percentInBand > 0.65) return -0.5;  // Oltre metà superiore
    else if (percentInBand < 0.15) return 1;    // Vicino alla banda inferiore
    else if (percentInBand < 0.35) return 0.5;  // Sotto metà inferiore
    
    // Distanza dalla banda media
    const distanceFromMiddle = Math.abs(price - middle) / middle;
    if (distanceFromMiddle < 0.005) return 0;  // Molto vicino alla banda media
    
    return 0; // Neutrale
}

/**
 * Calcola il segnale basato sul volume
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @returns {number} - Segnale da -2 a +2
 */
function calculateVolumeSignal(technicalIndicators) {
    if (!technicalIndicators.volume || 
        technicalIndicators.volume.current === null || 
        technicalIndicators.volume.average === null ||
        !technicalIndicators.priceData) return null;
    
    const currentVolume = technicalIndicators.volume.current;
    const avgVolume = technicalIndicators.volume.average;
    const priceChange = technicalIndicators.priceData.change || 0;
    
    // Volume anomalo (molto superiore alla media)
    if (currentVolume > avgVolume * 2) {
        return priceChange > 0 ? 2 : -2;  // Alto volume con prezzo in aumento/diminuzione
    }
    
    // Volume superiore alla media
    if (currentVolume > avgVolume * 1.5) {
        return priceChange > 0 ? 1.5 : -1.5;
    }
    
    // Volume moderatamente superiore alla media
    if (currentVolume > avgVolume * 1.2) {
        return priceChange > 0 ? 1 : -1;
    }
    
    // Volume inferiore alla media
    if (currentVolume < avgVolume * 0.5) {
        return 0.5;  // Volume basso suggerisce indecisione o consolidamento
    }
    
    return 0;  // Volume nella norma, segnale neutro
}

/**
 * Calcola il segnale basato sui pattern tecnici identificati
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @returns {number} - Segnale da -2 a +2
 */
function calculatePatternSignal(technicalIndicators) {
    if (!technicalIndicators.trend || 
        !technicalIndicators.trend.patterns || 
        technicalIndicators.trend.patterns.length === 0) return null;
    
    let patternSignal = 0;
    let patternWeight = 0;
    
    // Analizza tutti i pattern identificati
    for (const pattern of technicalIndicators.trend.patterns) {
        let signalValue = 0;
        let weight = 1;
        
        // Determina il valore del segnale in base al tipo di pattern
        if (pattern.pattern === "Trend") {
            signalValue = pattern.direction === "rialzista" ? 1 : -1;
            
            // Adatta il peso in base alla forza del trend
            if (pattern.strength === "forte") weight = 2;
            else if (pattern.strength === "debole") weight = 0.5;
        } 
        else if (pattern.pattern === "Doppio Massimo") {
            signalValue = -1.5;  // Pattern ribassista
        } 
        else if (pattern.pattern === "Doppio Minimo") {
            signalValue = 1.5;   // Pattern rialzista
        } 
        else if (pattern.implication) {
            // Usa l'implicazione esplicita se disponibile
            signalValue = pattern.implication === "rialzista" ? 1.5 : 
                         pattern.implication === "ribassista" ? -1.5 : 0;
        }
        
        patternSignal += signalValue * weight;
        patternWeight += weight;
    }
    
    // Normalizza il segnale
    return patternWeight > 0 ? patternSignal / patternWeight : null;
}

/**
 * Determina la raccomandazione in base al punteggio normalizzato
 * @param {number} score - Punteggio normalizzato da -10 a +10
 * @returns {string} - Raccomandazione testuale
 */
function determineRecommendation(score) {
    if (score > 7) {
        return "Compra Forte";
    } else if (score > 3) {
        return "Compra";
    } else if (score > -3) {
        return "Mantieni";
    } else if (score > -7) {
        return "Vendi";
    } else {
        return "Vendi Forte";
    }
}

/**
 * Determina il livello di confidenza della raccomandazione
 * @param {number} score - Punteggio normalizzato
 * @param {Object} signals - Segnali degli indicatori
 * @returns {string} - Livello di confidenza (Alta, Media, Bassa)
 */
function determineConfidence(score, signals) {
    // Calcola la deviazione standard dei segnali come misura di coerenza
    const validSignals = Object.values(signals).filter(signal => signal !== null);
    if (validSignals.length < 2) return "Bassa"; // Troppo pochi segnali
    
    const mean = validSignals.reduce((sum, val) => sum + val, 0) / validSignals.length;
    const squaredDiffs = validSignals.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length;
    const stdDev = Math.sqrt(variance);
    
    // Calcola il rapporto segnale/rumore
    const signalToNoise = Math.abs(mean) / (stdDev || 1);
    
    // Valuta la confidenza in base alla coerenza dei segnali e alla forza del punteggio
    const scoreStrength = Math.abs(score) > 5 ? "alta" : Math.abs(score) > 2 ? "media" : "bassa";
    const signalCoherence = signalToNoise > 1.5 ? "alta" : signalToNoise > 0.8 ? "media" : "bassa";
    
    // Combina i fattori per determinare la confidenza complessiva
    if (scoreStrength === "alta" && signalCoherence === "alta") {
        return "Alta";
    } else if (scoreStrength === "bassa" || signalCoherence === "bassa") {
        return "Bassa";
    } else {
        return "Media";
    }
}

// Esporta le funzioni
export {
    calculateWeightedRecommendation,
    calculateRSISignal,
    calculateMACDSignal,
    calculateEMASignal,
    calculateADXSignal,
    calculateBollingerSignal,
    calculateVolumeSignal,
    calculatePatternSignal
};