/**
 * Modulo di utility per analisi tecniche avanzate
 * Contiene funzioni per calcolare metriche e rilevare pattern
 */

/**
 * Calcola la distanza percentuale dal massimo a 52 settimane
 * @param {Object} technicalIndicators - Oggetto contenente i dati tecnici
 * @returns {number|null} - Distanza percentuale o null se dati non disponibili
 */
function calculatePercentFromHigh(technicalIndicators) {
    if (!technicalIndicators.priceData || !technicalIndicators.priceData.current) return null;
    
    // Usa un valore simulato per demo, nella realtà verrebbe recuperato da API
    const high52Week = technicalIndicators.priceData.current * 1.3; // Massimo stimato +30%
    const percentFromHigh = ((high52Week - technicalIndicators.priceData.current) / high52Week) * 100;
    
    return percentFromHigh.toFixed(2);
}

/**
 * Calcola la distanza percentuale dal minimo a 52 settimane
 * @param {Object} technicalIndicators - Oggetto contenente i dati tecnici
 * @returns {number|null} - Distanza percentuale o null se dati non disponibili
 */
function calculatePercentFromLow(technicalIndicators) {
    if (!technicalIndicators.priceData || !technicalIndicators.priceData.current) return null;
    
    // Usa un valore simulato per demo, nella realtà verrebbe recuperato da API
    const low52Week = technicalIndicators.priceData.current * 0.8; // Minimo stimato -20%
    const percentFromLow = ((technicalIndicators.priceData.current - low52Week) / low52Week) * 100;
    
    return percentFromLow.toFixed(2);
}

/**
 * Rileva incroci recenti tra medie mobili
 * @param {Object} technicalIndicators - Oggetto contenente i dati tecnici
 * @returns {string|null} - Descrizione dell'incrocio o null se non rilevato
 */
function detectCrossovers(technicalIndicators) {
    if (!technicalIndicators.results || !technicalIndicators.results["Price Data"]) return null;
    
    const priceData = technicalIndicators.results["Price Data"];
    if (priceData.length < 2) return null;
    
    // Verifica crossover EMA e SMA
    const current = technicalIndicators.movingAverages;
    
    // Nella realtà dovremmo confrontare i valori attuali con quelli precedenti
    // Qui simuliamo un incrocio basato su valori correnti
    if (current.ema20 && current.smaShort && 
        Math.abs(current.ema20 - current.smaShort) / current.smaShort < 0.005) {
        return "EMA(20) incrocia SMA(" + technicalIndicators.movingAverages.periods.short + ")";
    }
    
    if (current.smaShort && current.smaMedium && 
        Math.abs(current.smaShort - current.smaMedium) / current.smaMedium < 0.007) {
        return "SMA(" + technicalIndicators.movingAverages.periods.short + 
               ") incrocia SMA(" + technicalIndicators.movingAverages.periods.medium + ")";
    }
    
    return "nessuno";
}

/**
 * Rileva divergenze tra RSI e prezzo
 * @param {Object} technicalIndicators - Oggetto contenente i dati tecnici
 * @returns {string|null} - Descrizione della divergenza o null se non rilevata
 */
function detectRSIDivergence(technicalIndicators) {
    if (!technicalIndicators.results || !technicalIndicators.results["Price Data"]) return null;
    
    const priceData = technicalIndicators.results["Price Data"];
    if (priceData.length < 10) return null;
    
    // Nella realtà dovremmo analizzare i dati storici degli ultimi periodi per rilevare divergenze
    // Qui simuliamo una divergenza basata su valori correnti
    
    // Simula una divergenza rialzista come esempio (prezzo scende, RSI sale)
    if (technicalIndicators.priceData.change < 0 && 
        technicalIndicators.momentum.rsi > 45 && 
        technicalIndicators.momentum.rsi < 55) {
        return "divergenza rialzista (prezzo in calo, RSI stabile/in crescita)";
    }
    
    // Simula una divergenza ribassista come esempio (prezzo sale, RSI scende)
    if (technicalIndicators.priceData.change > 0 && 
        technicalIndicators.momentum.rsi < 60 && 
        technicalIndicators.momentum.rsi > 40) {
        return "divergenza ribassista (prezzo in aumento, RSI stabile/in calo)";
    }
    
    return "nessuna";
}

/**
 * Rileva la direzione e forza del trend MACD
 * @param {Object} technicalIndicators - Oggetto contenente i dati tecnici
 * @returns {string|null} - Descrizione del trend MACD o null se non disponibile
 */
function detectMACDTrend(technicalIndicators) {
    if (!technicalIndicators.momentum || 
        !technicalIndicators.momentum.macd || 
        !technicalIndicators.momentum.macdSignal ||
        !technicalIndicators.momentum.macdHistogram) return null;
    
    const macd = technicalIndicators.momentum.macd;
    const signal = technicalIndicators.momentum.macdSignal;
    const histogram = technicalIndicators.momentum.macdHistogram;
    
    // Determina la direzione del MACD
    let direction = "";
    let strength = "";
    
    if (macd > signal) {
        direction = "rialzista";
        
        // Valuta la forza del segnale
        if (histogram > 0.002) {
            strength = "forte";
        } else if (histogram > 0) {
            strength = "moderato";
        } else {
            strength = "debole";
        }
        
        // Identifica segnali specifici
        if (macd < 0 && signal < 0 && macd > signal && histogram > 0) {
            return `${direction} (${strength}) - possibile inversione dal basso`;
        }
    } else {
        direction = "ribassista";
        
        // Valuta la forza del segnale
        if (histogram < -0.002) {
            strength = "forte";
        } else if (histogram < 0) {
            strength = "moderato";
        } else {
            strength = "debole";
        }
        
        // Identifica segnali specifici
        if (macd > 0 && signal > 0 && macd < signal && histogram < 0) {
            return `${direction} (${strength}) - possibile inversione dall'alto`;
        }
    }
    
    return `${direction} (${strength})`;
}

/**
 * Confronta la volatilità attuale con quella storica
 * @param {Object} technicalIndicators - Oggetto contenente i dati tecnici
 * @returns {string|null} - Descrizione comparativa della volatilità
 */
function compareHistoricalVolatility(technicalIndicators) {
    if (!technicalIndicators.volatility || !technicalIndicators.volatility.value) return null;
    
    const currentVolatility = parseFloat(technicalIndicators.volatility.value);
    
    // Simula una volatilità storica media
    const historicalVolatility = 15; // Valore simulato per l'esempio
    
    const ratio = currentVolatility / historicalVolatility;
    
    if (ratio > 1.5) {
        return "molto elevata rispetto alla media storica";
    } else if (ratio > 1.1) {
        return "superiore alla media storica";
    } else if (ratio >= 0.9) {
        return "in linea con la media storica";
    } else if (ratio >= 0.6) {
        return "inferiore alla media storica";
    } else {
        return "significativamente inferiore alla media storica";
    }
}

/**
 * Calcola la posizione percentuale all'interno del canale di Bollinger
 * @param {Object} technicalIndicators - Oggetto contenente i dati tecnici
 * @returns {number|null} - Posizione percentuale (0=banda inferiore, 100=banda superiore)
 */
function calculateBollingerPosition(technicalIndicators) {
    if (!technicalIndicators.volatility || 
        !technicalIndicators.volatility.bollingerUpper || 
        !technicalIndicators.volatility.bollingerLower || 
        !technicalIndicators.priceData ||
        !technicalIndicators.priceData.current) return null;
    
    const current = technicalIndicators.priceData.current;
    const upper = technicalIndicators.volatility.bollingerUpper;
    const lower = technicalIndicators.volatility.bollingerLower;
    
    const range = upper - lower;
    if (range === 0) return 50; // Previene divisione per zero
    
    const position = ((current - lower) / range) * 100;
    
    return position.toFixed(1);
}

/**
 * Calcola la distanza percentuale dal supporto più vicino
 * @param {Object} technicalIndicators - Oggetto contenente i dati tecnici
 * @returns {number|null} - Distanza percentuale o null se non disponibile
 */
function calculateNearestSupport(technicalIndicators) {
    if (!technicalIndicators.levels || 
        !technicalIndicators.levels.supports || 
        technicalIndicators.levels.supports.length === 0 ||
        !technicalIndicators.priceData ||
        !technicalIndicators.priceData.current) return null;
    
    const currentPrice = technicalIndicators.priceData.current;
    const supports = technicalIndicators.levels.supports;
    
    // Filtra solo i supporti sotto il prezzo attuale
    const validSupports = supports.filter(support => support < currentPrice);
    
    if (validSupports.length === 0) return null;
    
    // Trova il supporto più vicino
    const nearestSupport = Math.max(...validSupports);
    
    // Calcola la distanza percentuale
    const distancePercent = ((currentPrice - nearestSupport) / currentPrice) * 100;
    
    return distancePercent.toFixed(2);
}

/**
 * Calcola la distanza percentuale dalla resistenza più vicina
 * @param {Object} technicalIndicators - Oggetto contenente i dati tecnici
 * @returns {number|null} - Distanza percentuale o null se non disponibile
 */
function calculateNearestResistance(technicalIndicators) {
    if (!technicalIndicators.levels || 
        !technicalIndicators.levels.resistances || 
        technicalIndicators.levels.resistances.length === 0 ||
        !technicalIndicators.priceData ||
        !technicalIndicators.priceData.current) return null;
    
    const currentPrice = technicalIndicators.priceData.current;
    const resistances = technicalIndicators.levels.resistances;
    
    // Filtra solo le resistenze sopra il prezzo attuale
    const validResistances = resistances.filter(resistance => resistance > currentPrice);
    
    if (validResistances.length === 0) return null;
    
    // Trova la resistenza più vicina
    const nearestResistance = Math.min(...validResistances);
    
    // Calcola la distanza percentuale
    const distancePercent = ((nearestResistance - currentPrice) / currentPrice) * 100;
    
    return distancePercent.toFixed(2);
}

/**
 * Rileva il trend di volume recente
 * @param {Object} technicalIndicators - Oggetto contenente i dati tecnici
 * @returns {string|null} - Descrizione del trend di volume o null se non disponibile
 */
function detectVolumeTrend(technicalIndicators) {
    if (!technicalIndicators.results || 
        !technicalIndicators.results["Price Data"] || 
        technicalIndicators.results["Price Data"].length < 5) return null;
    
    const volumeData = technicalIndicators.results["Price Data"]
        .slice(0, 5)
        .map(data => data.volume || 0);
    
    // Calcola la tendenza del volume (crescente, decrescente o stabile)
    let increasing = 0;
    let decreasing = 0;
    
    for (let i = 1; i < volumeData.length; i++) {
        if (volumeData[i] > volumeData[i-1]) {
            increasing++;
        } else if (volumeData[i] < volumeData[i-1]) {
            decreasing++;
        }
    }
    
    // Determina il trend di volume in base alla prevalenza
    if (increasing > decreasing && increasing >= 3) {
        return "in forte aumento";
    } else if (increasing > decreasing) {
        return "in moderato aumento";
    } else if (decreasing > increasing && decreasing >= 3) {
        return "in forte diminuzione";
    } else if (decreasing > increasing) {
        return "in moderata diminuzione";
    } else {
        return "stabile";
    }
}

/**
 * Trova il livello (supporto o resistenza) più vicino al prezzo attuale
 * @param {Array<number>} levels - Array di livelli
 * @param {number} currentPrice - Prezzo attuale
 * @returns {number} - Il livello più vicino
 */
function findNearestLevel(levels, currentPrice) {
    if (!levels || levels.length === 0) return currentPrice;
    
    let closestLevel = levels[0];
    let minDistance = Math.abs(currentPrice - closestLevel);
    
    for (let i = 1; i < levels.length; i++) {
        const distance = Math.abs(currentPrice - levels[i]);
        if (distance < minDistance) {
            minDistance = distance;
            closestLevel = levels[i];
        }
    }
    
    return closestLevel.toFixed(2);
}

/**
 * Calcola un target di prezzo basato sulla raccomandazione
 * @param {Object} technicalIndicators - Dati tecnici
 * @param {string} recommendation - Raccomandazione generata
 * @returns {string} - Target di prezzo formattato
 */
function calculatePriceTarget(technicalIndicators, recommendation) {
    const currentPrice = technicalIndicators.priceData.current;
    let targetMultiplier;
    
    // Imposta il moltiplicatore target in base alla raccomandazione
    switch (recommendation) {
        case 'Compra Forte':
            targetMultiplier = 1.10; // +10%
            break;
        case 'Compra':
            targetMultiplier = 1.05; // +5%
            break;
        case 'Mantieni':
            targetMultiplier = 1.02; // +2%
            break;
        case 'Vendi':
            targetMultiplier = 0.95; // -5%
            break;
        case 'Vendi Forte':
            targetMultiplier = 0.90; // -10%
            break;
        default:
            targetMultiplier = 1.0;
    }
    
    // Adatta il target anche in base ai livelli di supporto/resistenza
    if (technicalIndicators.levels && technicalIndicators.levels.resistances && recommendation.includes('Compra')) {
        // Per raccomandazioni d'acquisto, il target è la resistenza più vicina sopra il target calcolato
        const calculatedTarget = currentPrice * targetMultiplier;
        const resistances = technicalIndicators.levels.resistances.filter(r => r > calculatedTarget);
        
        if (resistances.length > 0) {
            const nearestResistance = Math.min(...resistances);
            return nearestResistance.toFixed(2);
        }
    } else if (technicalIndicators.levels && technicalIndicators.levels.supports && recommendation.includes('Vendi')) {
        // Per raccomandazioni di vendita, il target è il supporto più vicino sotto il target calcolato
        const calculatedTarget = currentPrice * targetMultiplier;
        const supports = technicalIndicators.levels.supports.filter(s => s < calculatedTarget);
        
        if (supports.length > 0) {
            const nearestSupport = Math.max(...supports);
            return nearestSupport.toFixed(2);
        }
    }
    
    // Se non ci sono livelli adeguati, usa il target calcolato
    return (currentPrice * targetMultiplier).toFixed(2);
}

/**
 * Calcola uno stop loss basato sulla raccomandazione
 * @param {Object} technicalIndicators - Dati tecnici
 * @param {string} recommendation - Raccomandazione generata
 * @returns {string} - Stop loss formattato
 */
function calculateStopLoss(technicalIndicators, recommendation) {
    const currentPrice = technicalIndicators.priceData.current;
    let stopMultiplier;
    
    // Imposta il moltiplicatore stop loss in base alla raccomandazione
    switch (recommendation) {
        case 'Compra Forte':
        case 'Compra':
            // Per acquisti, lo stop loss è sotto il prezzo attuale
            stopMultiplier = 0.95; // -5%
            
            // Se ci sono supporti validi, usa quello più vicino sotto il prezzo
            if (technicalIndicators.levels && technicalIndicators.levels.supports) {
                const supports = technicalIndicators.levels.supports.filter(s => s < currentPrice);
                if (supports.length > 0) {
                    return Math.max(...supports).toFixed(2);
                }
            }
            break;
        case 'Vendi':
        case 'Vendi Forte':
            // Per vendite, lo stop loss è sopra il prezzo attuale
            stopMultiplier = 1.05; // +5%
            
            // Se ci sono resistenze valide, usa quella più vicina sopra il prezzo
            if (technicalIndicators.levels && technicalIndicators.levels.resistances) {
                const resistances = technicalIndicators.levels.resistances.filter(r => r > currentPrice);
                if (resistances.length > 0) {
                    return Math.min(...resistances).toFixed(2);
                }
            }
            break;
        default:
            // Per "Mantieni", usa uno stop loss minimo
            stopMultiplier = 0.97; // -3%
    }
    
    // Se non ci sono livelli adeguati, usa lo stop calcolato
    return (currentPrice * stopMultiplier).toFixed(2);
}

/**
 * Calcola il rapporto rischio/rendimento della raccomandazione
 * @param {Object} technicalIndicators - Dati tecnici
 * @param {string} recommendation - Raccomandazione generata
 * @returns {string} - Rapporto rischio/rendimento formattato
 */
function calculateRiskRewardRatio(technicalIndicators, recommendation) {
    const currentPrice = technicalIndicators.priceData.current;
    const target = parseFloat(calculatePriceTarget(technicalIndicators, recommendation));
    const stopLoss = parseFloat(calculateStopLoss(technicalIndicators, recommendation));
    
    let risk, reward;
    
    if (recommendation.includes('Compra')) {
        // Per posizioni long: rischio = prezzo attuale - stop loss, rendimento = target - prezzo attuale
        risk = currentPrice - stopLoss;
        reward = target - currentPrice;
    } else if (recommendation.includes('Vendi')) {
        // Per posizioni short: rischio = stop loss - prezzo attuale, rendimento = prezzo attuale - target
        risk = stopLoss - currentPrice;
        reward = currentPrice - target;
    } else {
        // Per "Mantieni", il rapporto è bilanciato
        return "1:1";
    }
    
    if (risk <= 0) return "N/D"; // Previene divisione per zero o rapporti negativi
    
    const ratio = (reward / risk).toFixed(1);
    return `1:${ratio}`;
}

// Esporta le funzioni
export {
    calculatePercentFromHigh,
    calculatePercentFromLow,
    detectCrossovers,
    detectRSIDivergence,
    detectMACDTrend,
    compareHistoricalVolatility,
    calculateBollingerPosition,
    calculateNearestSupport,
    calculateNearestResistance,
    detectVolumeTrend,
    findNearestLevel,
    calculatePriceTarget,
    calculateStopLoss,
    calculateRiskRewardRatio
};