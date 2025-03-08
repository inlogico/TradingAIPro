/**
 * Modulo di utility per la gestione di livelli di supporto, resistenza e target price
 */

/**
 * Trova il livello di supporto più vicino al prezzo attuale che sia inferiore ad esso
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @returns {number|null} - Livello di supporto o null se non disponibile
 */
function findNearestSupportBelow(technicalIndicators) {
    if (!technicalIndicators.levels || 
        !technicalIndicators.levels.supports || 
        !technicalIndicators.priceData ||
        technicalIndicators.levels.supports.length === 0) return null;
    
    const currentPrice = technicalIndicators.priceData.current;
    const supports = technicalIndicators.levels.supports;
    
    // Filtra i supporti sotto il prezzo attuale
    const validSupports = supports.filter(support => support < currentPrice);
    
    if (validSupports.length === 0) return null;
    
    // Trova il supporto più vicino sotto il prezzo attuale
    return Math.max(...validSupports);
}

/**
 * Trova il livello di resistenza più vicino al prezzo attuale che sia superiore ad esso
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @returns {number|null} - Livello di resistenza o null se non disponibile
 */
function findNearestResistanceAbove(technicalIndicators) {
    if (!technicalIndicators.levels || 
        !technicalIndicators.levels.resistances || 
        !technicalIndicators.priceData ||
        technicalIndicators.levels.resistances.length === 0) return null;
    
    const currentPrice = technicalIndicators.priceData.current;
    const resistances = technicalIndicators.levels.resistances;
    
    // Filtra le resistenze sopra il prezzo attuale
    const validResistances = resistances.filter(resistance => resistance > currentPrice);
    
    if (validResistances.length === 0) return null;
    
    // Trova la resistenza più vicina sopra il prezzo attuale
    return Math.min(...validResistances);
}

/**
 * Calcola un target price basato su Fibonacci per posizioni long
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @returns {Object|null} - Oggetto con livelli target o null se non disponibile
 */
function calculateFibonacciTargetsLong(technicalIndicators) {
    if (!technicalIndicators.priceData) return null;
    
    const currentPrice = technicalIndicators.priceData.current;
    const support = findNearestSupportBelow(technicalIndicators);
    
    if (!support) return null;
    
    const range = currentPrice - support;
    
    return {
        target1: currentPrice + range * 0.382,  // Target 38.2%
        target2: currentPrice + range * 0.618,  // Target 61.8%
        target3: currentPrice + range * 1.0,    // Target 100%
        target4: currentPrice + range * 1.618   // Target 161.8%
    };
}

/**
 * Calcola un target price basato su Fibonacci per posizioni short
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @returns {Object|null} - Oggetto con livelli target o null se non disponibile
 */
function calculateFibonacciTargetsShort(technicalIndicators) {
    if (!technicalIndicators.priceData) return null;
    
    const currentPrice = technicalIndicators.priceData.current;
    const resistance = findNearestResistanceAbove(technicalIndicators);
    
    if (!resistance) return null;
    
    const range = resistance - currentPrice;
    
    return {
        target1: currentPrice - range * 0.382,  // Target 38.2%
        target2: currentPrice - range * 0.618,  // Target 61.8%
        target3: currentPrice - range * 1.0,    // Target 100%
        target4: currentPrice - range * 1.618   // Target 161.8%
    };
}

/**
 * Calcola uno stop loss basato su ATR (Average True Range)
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @param {string} direction - Direzione della posizione ('long' o 'short')
 * @param {number} multiplier - Moltiplicatore dell'ATR, default 2
 * @returns {number|null} - Livello di stop loss o null se non disponibile
 */
function calculateATRStopLoss(technicalIndicators, direction, multiplier = 2) {
    if (!technicalIndicators.priceData || !technicalIndicators.volatility) return null;
    
    // Stima l'ATR basato sulla volatilità
    // In un caso reale, useresti un vero ATR calcolato sui dati storici
    const atrEstimate = technicalIndicators.priceData.current * 
        (technicalIndicators.volatility.value / 100) / Math.sqrt(252);
    
    const currentPrice = technicalIndicators.priceData.current;
    
    if (direction === 'long') {
        return currentPrice - (atrEstimate * multiplier);
    } else if (direction === 'short') {
        return currentPrice + (atrEstimate * multiplier);
    }
    
    return null;
}

/**
 * Trova un livello di stop loss basato sulla media mobile
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @param {string} direction - Direzione della posizione ('long' o 'short')
 * @returns {number|null} - Livello di stop loss o null se non disponibile
 */
function findMABasedStopLoss(technicalIndicators, direction) {
    if (!technicalIndicators.movingAverages) return null;
    
    const mas = technicalIndicators.movingAverages;
    const currentPrice = technicalIndicators.priceData?.current;
    
    if (!currentPrice) return null;
    
    if (direction === 'long') {
        // Per posizioni long, usa la MA più vicina sotto al prezzo come stop
        const validMAs = [
            mas.smaShort,
            mas.ema20,
            mas.smaMedium
        ].filter(ma => ma !== null && ma < currentPrice);
        
        return validMAs.length > 0 ? Math.max(...validMAs) : null;
    } else if (direction === 'short') {
        // Per posizioni short, usa la MA più vicina sopra al prezzo come stop
        const validMAs = [
            mas.smaShort,
            mas.ema20,
            mas.smaMedium
        ].filter(ma => ma !== null && ma > currentPrice);
        
        return validMAs.length > 0 ? Math.min(...validMAs) : null;
    }
    
    return null;
}

/**
 * Calcola il miglior livello di stop loss in base alle condizioni di mercato
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @param {string} direction - Direzione della posizione ('long' o 'short')
 * @param {string} profileType - Tipo di profilo di trading
 * @returns {number|null} - Livello di stop loss ottimale
 */
function calculateOptimalStopLoss(technicalIndicators, direction, profileType) {
    // Normalizza il tipo di profilo
    const profile = profileType.toLowerCase().replace(/\s+/g, '');
    
    // Array per memorizzare i possibili stop loss
    const possibleStops = [];
    
    // 1. Cerca stop loss basato su supporti/resistenze
    if (direction === 'long') {
        const supportStop = findNearestSupportBelow(technicalIndicators);
        if (supportStop) possibleStops.push({ value: supportStop, weight: 3, type: 'support' });
    } else {
        const resistanceStop = findNearestResistanceAbove(technicalIndicators);
        if (resistanceStop) possibleStops.push({ value: resistanceStop, weight: 3, type: 'resistance' });
    }
    
    // 2. Stop loss basato su ATR (volatilità)
    let atrMultiplier;
    switch(profile) {
        case 'falcodelloscalping':
            atrMultiplier = 1.5;
            break;
        case 'serpentedelloswingtrading':
        case 'swing':
            atrMultiplier = 2;
            break;
        case 'orsodellpositiontrading':
        case 'position':
            atrMultiplier = 2.5;
            break;
        case 'tartarugadell\'investimento':
        case 'longterm':
            atrMultiplier = 3;
            break;
        default:
            atrMultiplier = 2;
    }
    
    const atrStop = calculateATRStopLoss(technicalIndicators, direction, atrMultiplier);
    if (atrStop) possibleStops.push({ value: atrStop, weight: 2, type: 'atr' });
    
    // 3. Stop loss basato su medie mobili
    const maStop = findMABasedStopLoss(technicalIndicators, direction);
    if (maStop) possibleStops.push({ value: maStop, weight: 2, type: 'ma' });
    
    // 4. Stop loss percentuale fisso in base al profilo
    let percentStop;
    const currentPrice = technicalIndicators.priceData?.current;
    
    if (currentPrice) {
        let stopPercentage;
        
        switch(profile) {
            case 'falcodelloscalping':
                stopPercentage = 0.005; // 0.5%
                break;
            case 'serpentedelloswingtrading':
            case 'swing':
                stopPercentage = 0.02; // 2%
                break;
            case 'orsodellpositiontrading':
            case 'position':
                stopPercentage = 0.05; // 5%
                break;
            case 'tartarugadell\'investimento':
            case 'longterm':
                stopPercentage = 0.1; // 10%
                break;
            default:
                stopPercentage = 0.03; // 3%
        }
        
        percentStop = direction === 'long' 
            ? currentPrice * (1 - stopPercentage) 
            : currentPrice * (1 + stopPercentage);
        
        possibleStops.push({ value: percentStop, weight: 1, type: 'percent' });
    }
    
    // Se non ci sono stop loss validi, restituisci null
    if (possibleStops.length === 0) return null;
    
    // Ordina gli stop in base alla distanza dal prezzo attuale
    // Per long, vogliamo il più alto tra gli stop sotto il prezzo corrente
    // Per short, vogliamo il più basso tra gli stop sopra il prezzo corrente
    
    let bestStop = null;
    let bestScore = -Infinity;
    
    for (const stop of possibleStops) {
        // Calcola la distanza percentuale dal prezzo attuale
        const distance = Math.abs((stop.value - currentPrice) / currentPrice);
        
        // Calcola uno score basato su distanza e peso
        // Favorisce stop loss più lontani (meno probabilità di essere attivati)
        // ma dà importanza al tipo di stop (supporti/resistenze più affidabili)
        const score = distance * stop.weight;
        
        if (score > bestScore) {
            bestScore = score;
            bestStop = stop.value;
        }
    }
    
    return bestStop;
}

/**
 * Calcola un target price ottimale in base al profilo di trading e alla direzione
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @param {string} direction - Direzione della posizione ('long' o 'short')
 * @param {string} profileType - Tipo di profilo di trading
 * @returns {Object} - Oggetto con target price e descrizione
 */
function calculateOptimalTargetPrice(technicalIndicators, direction, profileType) {
    // Normalizza il tipo di profilo
    const profile = profileType.toLowerCase().replace(/\s+/g, '');
    
    const currentPrice = technicalIndicators.priceData?.current;
    if (!currentPrice) return null;
    
    // Array per memorizzare target potenziali
    const potentialTargets = [];
    
    // 1. Target basati su supporti/resistenze
    if (direction === 'long') {
        const resistance = findNearestResistanceAbove(technicalIndicators);
        if (resistance) {
            potentialTargets.push({
                value: resistance,
                weight: 3,
                type: 'resistance',
                description: 'resistenza più vicina'
            });
        }
    } else {
        const support = findNearestSupportBelow(technicalIndicators);
        if (support) {
            potentialTargets.push({
                value: support,
                weight: 3,
                type: 'support',
                description: 'supporto più vicino'
            });
        }
    }
    
    // 2. Target basati su livelli Fibonacci
    if (direction === 'long') {
        const fibTargets = calculateFibonacciTargetsLong(technicalIndicators);
        if (fibTargets) {
            potentialTargets.push({
                value: fibTargets.target1,
                weight: 1,
                type: 'fib38',
                description: 'ritracciamento Fibonacci 38.2%'
            });
            
            potentialTargets.push({
                value: fibTargets.target2,
                weight: 2,
                type: 'fib61',
                description: 'ritracciamento Fibonacci 61.8%'
            });
            
            potentialTargets.push({
                value: fibTargets.target3,
                weight: 1.5,
                type: 'fib100',
                description: 'estensione Fibonacci 100%'
            });
        }
    } else {
        const fibTargets = calculateFibonacciTargetsShort(technicalIndicators);
        if (fibTargets) {
            potentialTargets.push({
                value: fibTargets.target1,
                weight: 1,
                type: 'fib38',
                description: 'ritracciamento Fibonacci 38.2%'
            });
            
            potentialTargets.push({
                value: fibTargets.target2,
                weight: 2,
                type: 'fib61',
                description: 'ritracciamento Fibonacci 61.8%'
            });
            
            potentialTargets.push({
                value: fibTargets.target3,
                weight: 1.5,
                type: 'fib100',
                description: 'estensione Fibonacci 100%'
            });
        }
    }
    
    // 3. Target basati su percentuali in base al profilo
    let percentTarget;
    let targetPercentage;
    
    switch(profile) {
        case 'falcodelloscalping':
            targetPercentage = direction === 'long' ? 0.01 : 0.01; // 1%
            break;
        case 'serpentedelloswingtrading':
        case 'swing':
            targetPercentage = direction === 'long' ? 0.03 : 0.03; // 3%
            break;
        case 'orsodellpositiontrading':
        case 'position':
            targetPercentage = direction === 'long' ? 0.08 : 0.08; // 8%
            break;
        case 'tartarugadell\'investimento':
        case 'longterm':
            targetPercentage = direction === 'long' ? 0.15 : 0.15; // 15%
            break;
        default:
            targetPercentage = direction === 'long' ? 0.05 : 0.05; // 5%
    }
    
    percentTarget = direction === 'long' 
        ? currentPrice * (1 + targetPercentage) 
        : currentPrice * (1 - targetPercentage);
    
    potentialTargets.push({
        value: percentTarget,
        weight: 1,
        type: 'percent',
        description: `target percentuale (${targetPercentage * 100}%)`
    });
    
    // Se non ci sono target validi, restituisci un target predefinito
    if (potentialTargets.length === 0) {
        return {
            value: direction === 'long' 
                ? currentPrice * 1.05 
                : currentPrice * 0.95,
            description: 'target predefinito 5%'
        };
    }
    
    // Seleziona il miglior target in base al profilo
    let bestTarget;
    
    switch(profile) {
        case 'falcodelloscalping':
            // Lo scalper preferisce target più vicini ma con alta probabilità
            bestTarget = potentialTargets.reduce((best, target) => {
                const distance = Math.abs((target.value - currentPrice) / currentPrice);
                if (!best || (distance < 0.02 && target.weight > best.weight)) {
                    return target;
                }
                return best;
            }, null);
            break;
        
        case 'serpentedelloswingtrading':
        case 'swing':
            // Lo swing trader cerca un equilibrio tra distanza e fattibilità
            bestTarget = potentialTargets.reduce((best, target) => {
                const score = target.weight * (1 / Math.abs((target.value - currentPrice) / currentPrice));
                if (!best || score > best.score) {
                    return {...target, score};
                }
                return best;
            }, {score: -Infinity});
            break;
        
        case 'orsodellpositiontrading':
        case 'position':
        case 'tartarugadell\'investimento':
        case 'longterm':
            // Trader a lungo termine preferiscono target più ambiziosi
            bestTarget = potentialTargets.reduce((best, target) => {
                const distance = Math.abs((target.value - currentPrice) / currentPrice);
                if (!best || (target.weight >= 1.5 && distance > best.distance)) {
                    return {...target, distance};
                }
                return best;
            }, {distance: -Infinity});
            break;
        
        default:
            // Approccio bilanciato predefinito
            bestTarget = potentialTargets.reduce((best, target) => {
                if (!best || target.weight > best.weight) {
                    return target;
                }
                return best;
            }, null);
    }
    
    return {
        value: bestTarget.value,
        description: bestTarget.description
    };
}

/**
 * Calcola il rapporto rischio/rendimento di una posizione
 * @param {number} entryPrice - Prezzo di entrata
 * @param {number} targetPrice - Prezzo target
 * @param {number} stopLoss - Prezzo di stop loss
 * @returns {number|null} - Rapporto rischio/rendimento (1:X)
 */
function calculateRiskRewardRatio(entryPrice, targetPrice, stopLoss) {
    if (!entryPrice || !targetPrice || !stopLoss) return null;
    
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(targetPrice - entryPrice);
    
    if (risk === 0) return null; // Previene divisione per zero
    
    return reward / risk;
}

// Esporta le funzioni
export {
    findNearestSupportBelow,
    findNearestResistanceAbove,
    calculateFibonacciTargetsLong,
    calculateFibonacciTargetsShort,
    calculateATRStopLoss,
    findMABasedStopLoss,
    calculateOptimalStopLoss,
    calculateOptimalTargetPrice,
    calculateRiskRewardRatio
};