/**
 * Modulo per il calcolo degli indicatori tecnici finanziari
 */

/**
 * Calcola la Simple Moving Average (SMA)
 * @param {Array<number>} data - Array di prezzi
 * @param {number} period - Periodo per la SMA
 * @returns {Array<number|null>} - Array di valori SMA
 */
function calculateSMA(data, period) {
    let result = [];
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(null);
        } else {
            const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
            result.push(sum / period);
        }
    }
    return result;
}

/**
 * Calcola la Exponential Moving Average (EMA)
 * @param {Array<number>} prices - Array di prezzi
 * @param {number} period - Periodo per la EMA
 * @returns {Array<number|null>} - Array di valori EMA
 */
function calculateEMA(prices, period) {
    if (prices.length < period) return Array(prices.length).fill(null);
    
    let k = 2 / (period + 1);
    let emaArray = [prices[0]];

    for (let i = 1; i < prices.length; i++) {
        if (i < period) {
            // Metodo SMA per i primi "period" giorni
            const sma = prices.slice(0, i + 1).reduce((sum, price) => sum + price, 0) / (i + 1);
            emaArray.push(sma);
        } else {
            // Metodo EMA successivamente
            emaArray.push(prices[i] * k + emaArray[i - 1] * (1 - k));
        }
    }
    return emaArray;
}

/**
 * Calcola il MACD (Moving Average Convergence Divergence)
 * @param {Array<number>} prices - Array di prezzi
 * @returns {Array<Object|null>} - Array di oggetti con valori macd, signal e histogram
 */
function calculateMACD(prices) {
    if (prices.length < 26) return Array(prices.length).fill(null);
    
    let ema12 = calculateEMA(prices, 12);
    let ema26 = calculateEMA(prices, 26);
    
    // MACD Line = EMA(12) - EMA(26)
    let macdLine = ema12.map((val, i) => val - ema26[i]);
    
    // Signal Line = EMA(9) of MACD Line
    let signalLine = calculateEMA(macdLine.filter(val => val !== null), 9);
    
    // Riempire con null per allineare con l'array originale
    let paddedSignalLine = Array(macdLine.length).fill(null);
    const validValues = signalLine.filter(val => val !== null);
    
    for (let i = paddedSignalLine.length - validValues.length, j = 0; i < paddedSignalLine.length; i++, j++) {
        paddedSignalLine[i] = validValues[j];
    }
    
    // Histogram = MACD Line - Signal Line
    let histogram = macdLine.map((val, i) => 
        val !== null && paddedSignalLine[i] !== null ? val - paddedSignalLine[i] : null
    );
    
    return macdLine.map((val, i) => ({
        macd: val,
        signal: paddedSignalLine[i],
        histogram: histogram[i]
    }));
}

/**
 * Calcola il Relative Strength Index (RSI)
 * @param {Array<number>} prices - Array di prezzi
 * @param {number} period - Periodo per il RSI
 * @returns {Array<number|null>} - Array di valori RSI
 */
function calculateRSI(prices, period = 14) {
    if (prices.length <= period) return Array(prices.length).fill(null);
    
    // Calcola i cambiamenti di prezzo giornalieri
    let changes = [];
    for (let i = 1; i < prices.length; i++) {
        changes.push(prices[i] - prices[i - 1]);
    }
    
    // Calcola il guadagno medio e la perdita media per ogni periodo
    let rsiArray = Array(period).fill(null);
    
    for (let i = period; i < changes.length; i++) {
        let gains = 0;
        let losses = 0;
        
        for (let j = i - period; j < i; j++) {
            if (changes[j] > 0) {
                gains += changes[j];
            } else {
                losses -= changes[j]; // Assicuriamoci che le perdite siano positive
            }
        }
        
        const avgGain = gains / period;
        const avgLoss = losses / period;
        
        if (avgLoss === 0) {
            rsiArray.push(100);
        } else {
            const rs = avgGain / avgLoss;
            const rsi = 100 - (100 / (1 + rs));
            rsiArray.push(rsi);
        }
    }
    
    return rsiArray;
}

/**
 * Calcola le Bollinger Bands
 * @param {Array<number>} prices - Array di prezzi
 * @param {number} period - Periodo per le bande
 * @param {number} stdDev - Numero di deviazioni standard
 * @returns {Array<Object|null>} - Array di oggetti con valori middle, upper e lower
 */
function calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) return Array(prices.length).fill(null);
    
    let result = [];
    
    for (let i = 0; i < prices.length; i++) {
        if (i < period - 1) {
            result.push({
                middle: null,
                upper: null,
                lower: null
            });
            continue;
        }
        
        const slice = prices.slice(i - period + 1, i + 1);
        const mean = slice.reduce((sum, val) => sum + val, 0) / period;
        
        const squaredDiffs = slice.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
        const sd = Math.sqrt(variance);
        
        result.push({
            middle: mean,
            upper: mean + (sd * stdDev),
            lower: mean - (sd * stdDev)
        });
    }
    
    return result;
}

/**
 * Calcola l'Average Directional Index (ADX)
 * @param {Array<Object>} priceData - Array di oggetti prezzo con high, low e close
 * @param {number} period - Periodo per ADX
 * @returns {Array<Object|null>} - Array di oggetti con valori plusDI, minusDI e adx
 */
function calculateADX(priceData, period = 14) {
    if (priceData.length < period * 2) 
        return Array(priceData.length).fill(null);
    
    // Calcola TR, +DM, -DM
    let trArray = [0];
    let plusDM = [0];
    let minusDM = [0];
    
    for (let i = 1; i < priceData.length; i++) {
        const high = priceData[i].high;
        const low = priceData[i].low;
        const prevHigh = priceData[i-1].high;
        const prevLow = priceData[i-1].low;
        const prevClose = priceData[i-1].close;
        
        // True Range
        const tr1 = high - low;
        const tr2 = Math.abs(high - prevClose);
        const tr3 = Math.abs(low - prevClose);
        const tr = Math.max(tr1, tr2, tr3);
        trArray.push(tr);
        
        // Directional Movement
        const upMove = high - prevHigh;
        const downMove = prevLow - low;
        
        let pDM = 0;
        let mDM = 0;
        
        if (upMove > downMove && upMove > 0) {
            pDM = upMove;
        }
        
        if (downMove > upMove && downMove > 0) {
            mDM = downMove;
        }
        
        plusDM.push(pDM);
        minusDM.push(mDM);
    }
    
    // Calcola ATR, +DI, -DI
    let atr = [trArray[0]];
    let plusDI = [0];
    let minusDI = [0];
    
    for (let i = 1; i < trArray.length; i++) {
        if (i <= period) {
            // Metodo SMA per i primi periodi
            atr.push(trArray.slice(0, i+1).reduce((sum, val) => sum + val, 0) / (i+1));
            
            const sumPlusDM = plusDM.slice(0, i+1).reduce((sum, val) => sum + val, 0);
            const sumMinusDM = minusDM.slice(0, i+1).reduce((sum, val) => sum + val, 0);
            
            plusDI.push((sumPlusDM / atr[i]) * 100);
            minusDI.push((sumMinusDM / atr[i]) * 100);
        } else {
            // Metodo Wilder successivamente
            atr.push((atr[i-1] * (period-1) + trArray[i]) / period);
            
            const smoothedPlusDM = (plusDM[i-1] * (period-1) + plusDM[i]) / period;
            const smoothedMinusDM = (minusDM[i-1] * (period-1) + minusDM[i]) / period;
            
            plusDM[i] = smoothedPlusDM;
            minusDM[i] = smoothedMinusDM;
            
            plusDI.push((smoothedPlusDM / atr[i]) * 100);
            minusDI.push((smoothedMinusDM / atr[i]) * 100);
        }
    }
    
    // Calcola DX e ADX
    let dx = [0];
    let adx = Array(period + 1).fill(null);
    
    for (let i = 1; i < plusDI.length; i++) {
        if (plusDI[i] + minusDI[i] === 0) {
            dx.push(0);
        } else {
            dx.push((Math.abs(plusDI[i] - minusDI[i]) / (plusDI[i] + minusDI[i])) * 100);
        }
        
        if (i >= period + 1) {
            if (i === period + 1) {
                // Prima media di DX per ADX
                adx[i] = dx.slice(i-period, i+1).reduce((sum, val) => sum + val, 0) / period;
            } else {
                // Metodo Wilder successivamente
                adx[i] = ((adx[i-1] * (period-1)) + dx[i]) / period;
            }
        }
    }
    
    // Crea oggetto risultato
    let result = [];
    for (let i = 0; i < priceData.length; i++) {
        result.push({
            plusDI: plusDI[i],
            minusDI: minusDI[i],
            adx: adx[i]
        });
    }
    
    return result;
}

/**
 * Calcola i livelli di supporto e resistenza
 * @param {Array<Object>} priceData - Array di oggetti prezzo con high, low e close
 * @param {number} lookbackPeriods - Periodi da analizzare
 * @returns {Object} - Oggetto con pivotPoint, resistanceLevels e supportLevels
 */
function calculateSupportResistance(priceData, lookbackPeriods = 20) {
    // Prendi i dati del periodo di analisi
    const relevantData = priceData.slice(0, lookbackPeriods);
    
    // Identifica massimi e minimi significativi
    let highs = [];
    let lows = [];
    
    for (let i = 1; i < relevantData.length - 1; i++) {
        // Identifica massimi locali
        if (relevantData[i].high > relevantData[i-1].high && 
            relevantData[i].high > relevantData[i+1].high) {
            highs.push(relevantData[i].high);
        }
        
        // Identifica minimi locali
        if (relevantData[i].low < relevantData[i-1].low && 
            relevantData[i].low < relevantData[i+1].low) {
            lows.push(relevantData[i].low);
        }
    }
    
    // Raggruppa massimi e minimi simili (entro il 0.5%)
    let resistanceLevels = [];
    let supportLevels = [];
    
    // Funzione per raggruppare livelli simili
    const groupSimilarLevels = (arr) => {
        if (arr.length === 0) return [];
        
        arr.sort((a, b) => a - b);
        let grouped = [[arr[0]]];
        
        for (let i = 1; i < arr.length; i++) {
            const lastGroup = grouped[grouped.length - 1];
            const lastValue = lastGroup[lastGroup.length - 1];
            
            // Se il valore è entro lo 0.5% dall'ultimo, aggiungilo allo stesso gruppo
            if (Math.abs(arr[i] - lastValue) / lastValue < 0.005) {
                lastGroup.push(arr[i]);
            } else {
                grouped.push([arr[i]]);
            }
        }
        
        // Calcola la media per ogni gruppo
        return grouped.map(group => 
            group.reduce((sum, val) => sum + val, 0) / group.length
        );
    };
    
    resistanceLevels = groupSimilarLevels(highs);
    supportLevels = groupSimilarLevels(lows);
    
    // Calcola il pivot point usando il metodo standard
    const high = Math.max(...relevantData.map(d => d.high));
    const low = Math.min(...relevantData.map(d => d.low));
    const close = relevantData[0].close;
    
    const pivotPoint = (high + low + close) / 3;
    
    // Calcola i livelli di resistenza e supporto classici
    const resistance1 = 2 * pivotPoint - low;
    const resistance2 = pivotPoint + (high - low);
    const support1 = 2 * pivotPoint - high;
    const support2 = pivotPoint - (high - low);
    
    // Aggiungi i livelli classici ai livelli identificati
    if (!resistanceLevels.includes(resistance1)) resistanceLevels.push(resistance1);
    if (!resistanceLevels.includes(resistance2)) resistanceLevels.push(resistance2);
    if (!supportLevels.includes(support1)) supportLevels.push(support1);
    if (!supportLevels.includes(support2)) supportLevels.push(support2);
    
    // Ordina i livelli
    resistanceLevels.sort((a, b) => a - b);
    supportLevels.sort((a, b) => a - b);
    
    return {
        pivotPoint,
        resistanceLevels,
        supportLevels
    };
}

/**
 * Rileva pattern di trend e formazioni tecniche
 * @param {Array<Object>} priceData - Array di oggetti prezzo con high, low e close
 * @param {number} lookbackPeriods - Periodi da analizzare
 * @returns {Array<Object>} - Array di oggetti pattern rilevati
 */
function detectTrendPatterns(priceData, lookbackPeriods = 20) {
    const relevantData = priceData.slice(0, lookbackPeriods);
    let patterns = [];
    
    // Indicatore di direzione del trend
    const firstPrice = relevantData[relevantData.length - 1].close;
    const lastPrice = relevantData[0].close;
    const trendDirection = lastPrice > firstPrice ? "rialzista" : "ribassista";
    
    // Calcola regressione lineare per forza del trend
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    
    for (let i = 0; i < relevantData.length; i++) {
        const x = relevantData.length - 1 - i;  // Ordine cronologico invertito
        const y = relevantData[i].close;
        
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
    }
    
    const n = relevantData.length;
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calcola R-quadro per determinare la forza del trend
    const meanY = sumY / n;
    let totalVariation = 0;
    let explainedVariation = 0;
    
    for (let i = 0; i < relevantData.length; i++) {
        const x = relevantData.length - 1 - i;
        const y = relevantData[i].close;
        const yHat = slope * x + intercept;
        
        totalVariation += Math.pow(y - meanY, 2);
        explainedVariation += Math.pow(yHat - meanY, 2);
    }
    
    const rSquared = explainedVariation / totalVariation;
    const trendStrength = rSquared > 0.7 ? "forte" : rSquared > 0.3 ? "moderato" : "debole";
    
    patterns.push({
        pattern: "Trend",
        direction: trendDirection,
        strength: trendStrength,
        rSquared: rSquared
    });
    
    // Trova doppi massimi/minimi
    const findDoubleTops = () => {
        let highs = [];
        
        // Trova i massimi locali
        for (let i = 1; i < relevantData.length - 1; i++) {
            if (relevantData[i].high > relevantData[i-1].high && 
                relevantData[i].high > relevantData[i+1].high) {
                highs.push({ price: relevantData[i].high, index: i });
            }
        }
        
        // Cerca coppie di massimi simili (entro l'1%)
        for (let i = 0; i < highs.length - 1; i++) {
            for (let j = i + 1; j < highs.length; j++) {
                const priceDiff = Math.abs(highs[i].price - highs[j].price) / highs[i].price;
                const indexDiff = Math.abs(highs[i].index - highs[j].index);
                
                if (priceDiff < 0.01 && indexDiff > 3 && indexDiff < lookbackPeriods / 2) {
                    return {
                        found: true,
                        price: (highs[i].price + highs[j].price) / 2
                    };
                }
            }
        }
        
        return { found: false };
    };
    
    const findDoubleBottoms = () => {
        let lows = [];
        
        // Trova i minimi locali
        for (let i = 1; i < relevantData.length - 1; i++) {
            if (relevantData[i].low < relevantData[i-1].low && 
                relevantData[i].low < relevantData[i+1].low) {
                lows.push({ price: relevantData[i].low, index: i });
            }
        }
        
        // Cerca coppie di minimi simili (entro l'1%)
        for (let i = 0; i < lows.length - 1; i++) {
            for (let j = i + 1; j < lows.length; j++) {
                const priceDiff = Math.abs(lows[i].price - lows[j].price) / lows[i].price;
                const indexDiff = Math.abs(lows[i].index - lows[j].index);
                
                if (priceDiff < 0.01 && indexDiff > 3 && indexDiff < lookbackPeriods / 2) {
                    return {
                        found: true,
                        price: (lows[i].price + lows[j].price) / 2
                    };
                }
            }
        }
        
        return { found: false };
    };
    
    const doubleTops = findDoubleTops();
    const doubleBottoms = findDoubleBottoms();
    
    if (doubleTops.found) {
        patterns.push({
            pattern: "Doppio Massimo",
            price: doubleTops.price,
            implication: "ribassista"
        });
    }
    
    if (doubleBottoms.found) {
        patterns.push({
            pattern: "Doppio Minimo",
            price: doubleBottoms.price,
            implication: "rialzista"
        });
    }
    
    return patterns;
}

// Esporta le funzioni
export {
    calculateSMA,
    calculateEMA,
    calculateMACD,
    calculateRSI,
    calculateBollingerBands,
    calculateADX,
    calculateSupportResistance,
    detectTrendPatterns
};
