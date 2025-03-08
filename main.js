/**
 * Modulo principale per TradingAI Pro
 * Versione aggiornata con caching, validazione dati e logging avanzato
 */

import { 
    fetchHistoricalPrices, 
    fetchCompanyProfile, 
    fetchCompanyLogo, 
    fetchTechnicalIndicator, 
    fetchMarketContext, 
    fetchSentimentData,
    generateAIAnalysis
} from './dataFetcher.js';

import { 
    calculateEMA, 
    calculateMACD, 
    calculateRSI, 
    calculateBollingerBands, 
    calculateADX, 
    calculateSMA,
    calculateSupportResistance, 
    detectTrendPatterns 
} from './indicators.js';

import { 
    displayTechnicalOverview, 
    showError, 
    showLoading, 
    formatAnalysisText, 
    displayOrderSummary, 
    displaySentimentAnalysis 
} from './ui.js';

import { generateMT4Order, generateOrderSummary } from './orderGeneration.js';
import { generateMoneyManagementReport } from './moneyManagement.js';
import { 
    adjustRecommendationWithSentiment, 
    enrichAnalysisWithSentiment 
} from './sentimentAnalysis.js';
import { validateAssetData, validateTechnicalData, validateOrderData } from './validation.js';
import { CONFIG } from './config.js';
import Logger from './advanced-logger.js';
import APICache from './caching.js';

// Variabili globali
let latestData = null;
let marketContext = {};
let generatedOrder = null;
let sentimentData = null;

// Profili di trading (mantenuti da config.js)
const tradingProfiles = CONFIG.tradingProfiles;

/**
 * Aggiorna le informazioni del profilo selezionato
 * @param {string} profileKey - Chiave del profilo di trading
 */
function updateProfileInfo(profileKey) {
    try {
        // Utilizzo dell'ID sicuro garantito dalla funzione wrapper
        const profileInfo = document.getElementById('profileInfo');
        
        // Controllo di sicurezza per il profilo
        if (!profileKey || !tradingProfiles[profileKey]) {
            Logger.warn(`Profilo non valido: ${profileKey}, uso dello swing come fallback`);
            profileKey = 'swing';
        }
        
        const profile = tradingProfiles[profileKey];
        
        if (!profile) {
            profileInfo.innerHTML = '';
            return;
        }
        
        // Costruzione sicura dell'HTML
        try {
            let html = `
                <div class="profile-${profileKey}">
                    <h3><span>${profile.icon}</span> ${profile.name}</h3>
                    <div><strong>${profile.description}</strong></div>
                    <div>Orizzonte temporale: ${profile.horizon}</div>
                    <div>Indicatori principali: ${profile.indicators}</div>
                    
                    <div class="characteristics">
                        ${profile.characteristics.map(c => `<span>${c}</span>`).join('')}
                    </div>
                    
                    <div class="why-animal">
                        <strong>Perché ${profile.icon.trim()}?</strong> ${profile.whyAnimal}
                    </div>
                </div>
            `;
            
            profileInfo.innerHTML = html;
            Logger.debug(`Informazioni profilo aggiornate: ${profile.name}`);
        } catch (error) {
            Logger.error("Errore nell'aggiornamento del profilo:", { error: error.message, profileKey });
            profileInfo.innerHTML = `<div class="error-message">Errore nel caricamento del profilo</div>`;
        }
    } catch (error) {
        Logger.error("Errore critico nell'aggiornamento del profilo:", { error: error.message });
    }
}

/**
 * Funzione principale per recuperare e processare i dati
 * @param {boolean} forceRefresh - Se true, forza un refresh ignorando la cache
 */
async function fetchAllData(forceRefresh = false) {
    try {
        const symbol = document.getElementById("symbol").value.toUpperCase();
        const profileSelect = document.getElementById("tradingProfile");
        const profileKey = profileSelect.value;
        const profile = tradingProfiles[profileKey];
        
        if (!profile) {
            showError("output", "Profilo di trading non valido!");
            return;
        }
        
        const timeframe = profile.defaultTimeframe;
        const lookbackPeriods = profile.lookbackPeriods;
        
        const output = document.getElementById("output");
        const technicalOverview = document.getElementById("technicalOverview");
        const aiAnalysisContainer = document.getElementById("aiAnalysisContainer");
        const orderSummaryContainer = document.getElementById("orderSummaryContainer");
        const sentimentContainer = document.getElementById("sentimentContainer");

        if (!symbol) {
            showError("output", "Inserisci un simbolo valido!");
            return;
        }

        output.innerHTML = `<div class="loading-container"><div class="loading-spinner"></div> Recupero dati per <strong>${symbol}</strong> (${timeframe}) con profilo ${profile.icon} ${profile.name}...</div>`;
        technicalOverview.style.display = "none";
        aiAnalysisContainer.style.display = "none";
        orderSummaryContainer.style.display = "none";
        sentimentContainer.style.display = "none";

        // Log dell'inizio dell'operazione
        Logger.info(`Avvio analisi per ${symbol}`, { 
            profile: profile.name, 
            timeframe, 
            lookbackPeriods,
            forceRefresh 
        });

        // Ottieni contesto di mercato generale
        marketContext = await fetchMarketContext(forceRefresh);

        // Recupera dati storici
        let priceData = await fetchHistoricalPrices(symbol, timeframe, lookbackPeriods, forceRefresh);
        
        if (!priceData || priceData.length === 0) {
            // Se i dati non sono disponibili, prova un fallback per timeframe lunghi
            if (timeframe === "daily" || timeframe === "weekly" || timeframe === "monthly") {
                const fallbackTimeframe = timeframe === "daily" ? "4hour" : "daily";
                
                Logger.warn(`Tentativo di fallback per ${symbol} su timeframe ${fallbackTimeframe}`);
                
                priceData = await fetchHistoricalPrices(symbol, fallbackTimeframe, lookbackPeriods * 2, true);
                
                if (priceData && priceData.length > 0) {
                    output.innerHTML = `<div class="warning-message">⚠️ Utilizzato timeframe ${fallbackTimeframe} come fallback per ${timeframe} (limiti API)</div>`;
                } else {
                    showError("output", `Impossibile recuperare i dati per ${symbol} con qualsiasi timeframe. Verifica il simbolo e riprova.`);
                    return;
                }
            } else {
                showError("output", `Impossibile recuperare i dati per ${symbol}. Verifica il simbolo e riprova.`);
                return;
            }
        }

        // Recupera profilo aziendale
        const companyProfile = await fetchCompanyProfile(symbol, forceRefresh);

        // Estrai dati fondamentali
        let companyInfo = {};
        if (companyProfile && validateAssetData(companyProfile)) {
            companyInfo = {
                name: companyProfile.companyName || symbol,
                sector: companyProfile.sector || "N/D",
                industry: companyProfile.industry || "N/D",
                beta: companyProfile.beta || 1,
                lastDividend: companyProfile.lastDiv || 0,
                mktCap: companyProfile.mktCap || 0,
                image: companyProfile.image || null
            };
        } else {
            Logger.warn(`Dati del profilo non validi o mancanti per ${symbol}, uso dati default`);
            companyInfo = {
                name: symbol,
                sector: "N/D",
                industry: "N/D",
                beta: 1,
                lastDividend: 0,
                mktCap: 0,
                image: null
            };
        }
        
        // Se non abbiamo un'immagine, prova a recuperarla separatamente
        if (!companyInfo.image) {
            companyInfo.image = await fetchCompanyLogo(symbol);
        }

        // Calcola gli indicatori tecnici
        const closingPrices = priceData.map(item => item.close);
        const openPrices = priceData.map(item => item.open);
        const highPrices = priceData.map(item => item.high);
        const lowPrices = priceData.map(item => item.low);
        const volumes = priceData.map(item => item.volume || 0);
        
        // Adatta i periodi degli indicatori in base al profilo
        const smaShortPeriod = profileKey === "scalping" ? 10 : profileKey === "swing" ? 20 : 30;
        const smaMediumPeriod = profileKey === "scalping" ? 20 : profileKey === "swing" ? 50 : 100;
        const smaLongPeriod = Math.min(200, closingPrices.length);
        const rsiPeriod = profileKey === "scalping" ? 7 : profileKey === "swing" ? 14 : 21;
        const bollingerPeriod = profileKey === "scalping" ? 10 : 20;
        const adxPeriod = profileKey === "scalping" ? 7 : 14;
        
        Logger.debug(`Calcolo indicatori tecnici per ${symbol}`, { 
            smaShortPeriod, 
            smaMediumPeriod, 
            rsiPeriod, 
            bollingerPeriod,
            adxPeriod
        });
        
        // Calcola indicatori con periodi adattati
        const smaShort = calculateSMA(closingPrices, smaShortPeriod);
        const smaMedium = calculateSMA(closingPrices, smaMediumPeriod);
        const smaLong = calculateSMA(closingPrices, smaLongPeriod);
        const ema20 = calculateEMA(closingPrices, smaShortPeriod);
        const rsi = calculateRSI(closingPrices, rsiPeriod);
        const macdData = calculateMACD(closingPrices);
        const bollingerBands = calculateBollingerBands(closingPrices, bollingerPeriod, 2);
        
        // Assicurati che ci siano abbastanza dati per gli indicatori avanzati
        let adxData = [];
        if (priceData.length >= adxPeriod * 2) {
            adxData = calculateADX(priceData, adxPeriod);
        } else {
            // Riempi con valori null se non ci sono abbastanza dati
            adxData = Array(priceData.length).fill({
                adx: null,
                plusDI: null,
                minusDI: null
            });
            Logger.warn(`Dati insufficienti per ADX: ${priceData.length} < ${adxPeriod * 2}`);
        }
        
        const supportResistance = calculateSupportResistance(priceData, lookbackPeriods);
        const patterns = detectTrendPatterns(priceData, lookbackPeriods);

        // Calcola ritorno e volatilità
        const returns = [];
        for (let i = 1; i < closingPrices.length; i++) {
            returns.push((closingPrices[i] / closingPrices[i-1]) - 1);
        }
        
        const avgReturn = returns.length > 0 ? 
            returns.reduce((sum, val) => sum + val, 0) / returns.length : 0;
        const squaredDiffs = returns.map(r => Math.pow(r - avgReturn, 2));
        const volatility = squaredDiffs.length > 0 ? 
            Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length) * 100 : 0;
        
        // Calcola volume medio
        const avgVolume = volumes.length > 0 ? 
            volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length : 0;
        
        // Prepara i dati completi per l'analisi
        const technicalIndicators = {
            priceData: {
                current: closingPrices[closingPrices.length - 1] || 0,
                open: openPrices[openPrices.length - 1] || 0,
                high: highPrices[highPrices.length - 1] || 0,
                low: lowPrices[lowPrices.length - 1] || 0,
                previous: closingPrices.length > 1 ? closingPrices[closingPrices.length - 2] : 0,
                change: closingPrices.length > 1 ? 
                    ((closingPrices[closingPrices.length - 1] / closingPrices[closingPrices.length - 2]) - 1) * 100 : 0
            },
            movingAverages: {
                smaShort: smaShort[smaShort.length - 1] || null,
                smaMedium: smaMedium[smaMedium.length - 1] || null,
                smaLong: smaLong[smaLong.length - 1] || null,
                ema20: ema20[ema20.length - 1] || null,
                periods: {
                    short: smaShortPeriod,
                    medium: smaMediumPeriod,
                    long: smaLongPeriod
                }
            },
            momentum: {
                rsi: rsi[rsi.length - 1] || null,
                rsiPeriod: rsiPeriod,
                macd: macdData.length > 0 ? macdData[macdData.length - 1]?.macd : null,
                macdSignal: macdData.length > 0 ? macdData[macdData.length - 1]?.signal : null,
                macdHistogram: macdData.length > 0 ? macdData[macdData.length - 1]?.histogram : null
            },
            volatility: {
                value: volatility !== null ? volatility.toFixed(2) : "N/D",
                bollingerUpper: bollingerBands.length > 0 ? bollingerBands[bollingerBands.length - 1]?.upper : null,
                bollingerMiddle: bollingerBands.length > 0 ? bollingerBands[bollingerBands.length - 1]?.middle : null,
                bollingerLower: bollingerBands.length > 0 ? bollingerBands[bollingerBands.length - 1]?.lower : null,
                bollingerWidth: bollingerBands.length > 0 && bollingerBands[bollingerBands.length - 1]?.middle ? 
                    (bollingerBands[bollingerBands.length - 1].upper - bollingerBands[bollingerBands.length - 1].lower) / 
                    bollingerBands[bollingerBands.length - 1].middle * 100 : null,
                bollingerPeriod: bollingerPeriod
            },
            trend: {
                adx: adxData.length > 0 ? adxData[adxData.length - 1]?.adx : null,
                plusDI: adxData.length > 0 ? adxData[adxData.length - 1]?.plusDI : null,
                minusDI: adxData.length > 0 ? adxData[adxData.length - 1]?.minusDI : null,
                adxPeriod: adxPeriod,
                patterns: patterns
            },
            levels: {
                pivotPoint: supportResistance.pivotPoint || 0,
                resistances: supportResistance.resistanceLevels || [],
                supports: supportResistance.supportLevels || []
            },
            volume: {
                current: volumes.length > 0 ? volumes[volumes.length - 1] : 0,
                average: avgVolume,
                change: volumes.length > 1 && volumes[volumes.length - 2] ? 
                    ((volumes[volumes.length - 1] / volumes[volumes.length - 2]) - 1) * 100 : 0
            }
        };
        
        // Valida gli indicatori tecnici
        if (!validateTechnicalData(technicalIndicators)) {
            Logger.warn(`Indicatori tecnici non validi per ${symbol}`);
            // Continua comunque con i dati disponibili
        }
        
        // Mappa i dati per CSV
        const headers = [
            "Date", "Open", "High", "Low", "Close", "Volume",
            `SMA(${smaShortPeriod})`, `SMA(${smaMediumPeriod})`, "EMA(20)", 
            `RSI(${rsiPeriod})`, "MACD", "MACD_Signal", "MACD_Histogram",
            "BB_Upper", "BB_Middle", "BB_Lower",
            `ADX(${adxPeriod})`, "Plus_DI", "Minus_DI"
        ];
        
        const csvRows = [headers.join(',')];
        
        priceData.forEach((priceEntry, i) => {
            const row = [
                priceEntry.date,
                priceEntry.open,
                priceEntry.high,
                priceEntry.low,
                priceEntry.close,
                priceEntry.volume || '',
                smaShort[i] || '',
                smaMedium[i] || '',
                ema20[i] || '',
                rsi[i] || '',
                macdData[i]?.macd || '',
                macdData[i]?.signal || '',
                macdData[i]?.histogram || '',
                bollingerBands[i]?.upper || '',
                bollingerBands[i]?.middle || '',
                bollingerBands[i]?.lower || '',
                adxData[i]?.adx || '',
                adxData[i]?.plusDI || '',
                adxData[i]?.minusDI || ''
            ];
            csvRows.push(row.join(','));
        });

        // Memorizza i dati per l'analisi AI, incluso il profilo di trading
        latestData = {
            symbol,
            companyInfo,
            timeframe,
            lookbackPeriods,
            results: { "Price Data": priceData },
            technicalIndicators,
            marketContext,
            tradingProfile: profile
        };
        
        // Memorizza i dati CSV per il download
        window.csvData = csvRows.join('\n');
        window.selectedSymbol = symbol;
        window.selectedTimeframe = timeframe;
        window.selectedProfile = profileKey;
        
        // Abilita il pulsante di download CSV
        const downloadBtn = document.getElementById('downloadCsvBtn');
        if (downloadBtn) {
            downloadBtn.disabled = false;
        }
        
        // Mostra dashboard degli indicatori tecnici
        displayTechnicalOverview(latestData);

        // Avvia automaticamente l'analisi del sentiment
        await fetchSentimentAnalysis(symbol, forceRefresh);

        output.innerHTML = `<p class="success-message">✅ Dati tecnici per ${symbol} recuperati e analizzati con successo usando il profilo ${profile.icon} ${profile.name}!</p>`;
        
        Logger.info(`Analisi completata con successo per ${symbol}`);
        
        // Genera report CSV dell'analisi
        try {
            // Genera report CSV dell'analisi
            const csvModule = await import('./csvGenerator.js');
            if (csvModule && csvModule.generateAnalysisReport) {
                await csvModule.generateAnalysisReport({
                    ...latestData,
                    sentimentData: sentimentData
                });
                
                Logger.info(`Report CSV dell'analisi generato con successo per ${symbol}`);
            } else {
                Logger.warn(`Modulo CSV non disponibile per ${symbol}`);
            }
        } catch (csvError) {
            Logger.error('Errore nella generazione del report CSV:', { error: csvError.message });
        }

        // Mostra il pulsante di archivio se disponibile
        if (typeof window.addArchiveButton === 'function') {
            window.addArchiveButton();
        }
    } catch (error) {
        showError("output", `Errore nell'elaborazione dei dati: ${error.message}`);
        Logger.error("Errore critico nell'analisi:", { error: error.message, stack: error.stack });
    }
}

/**
 * Funzione per recuperare l'analisi del sentiment
 * @param {string} symbol - Simbolo dell'asset
 * @param {boolean} forceRefresh - Se true, forza un refresh ignorando la cache
 */
async function fetchSentimentAnalysis(symbol, forceRefresh = false) {
    if (!symbol) {
        return;
    }

    const sentimentContainer = document.getElementById("sentimentContainer");
    
    // Mostra container e indicatore di caricamento
    sentimentContainer.style.display = "block";
    showLoading("sentimentOutput", "Analisi del sentiment in corso...");
    
    try {
        // Recupera l'analisi del sentiment
        sentimentData = await fetchSentimentData(symbol, forceRefresh);
        
        // Visualizza il report di sentiment
        displaySentimentAnalysis(sentimentData);
        
        Logger.info(`Analisi sentiment completata per ${symbol}`);
    } catch (error) {
        showError("sentimentOutput", `Errore nell'analisi del sentiment: ${error.message}`);
        Logger.error("Errore nell'analisi del sentiment:", { symbol, error: error.message });
    }
}

/**
 * Esegue l'analisi AI e genera una raccomandazione
 */
async function runAIAnalysis() {
    if (!latestData) {
        showError("output", "Prima di generare l'analisi AI, recupera i dati con 'Analizza Asset'!");
        return;
    }
    
    const aiOutputContainer = document.getElementById("aiAnalysisContainer");
    const aiOutput = document.getElementById("aiAnalysisOutput");
    const orderSummaryContainer = document.getElementById("orderSummaryContainer");
    
    // Mostra container e indicatore di caricamento
    aiOutputContainer.style.display = "block";
    orderSummaryContainer.style.display = "none";
    showLoading("aiAnalysisOutput", "Generazione analisi e raccomandazione in corso...");
    
    try {
        Logger.info(`Avvio analisi AI per ${latestData.symbol}`);
        
        // Aggiungi i dati di sentiment a latestData se disponibili
        if (sentimentData) {
            latestData.sentimentData = sentimentData;
        }
        
        // Genera analisi usando l'API Perplexity (ora con dati di sentiment integrati)
        let analysisHTML = await generateAIAnalysis(latestData);
        let recommendation = "";
        
        // Estrai la raccomandazione dal testo
        const recommendationMatch = analysisHTML.match(/RACCOMANDAZIONE:\s*(Compra|Vendi|Mantieni)(\s+Forte)?/i);
        if (recommendationMatch) {
            recommendation = recommendationMatch[0].replace('RACCOMANDAZIONE:', '').trim();
            Logger.info(`Raccomandazione estratta: ${recommendation}`);
        } else {
            Logger.warn(`Impossibile estrarre raccomandazione dall'analisi AI`);
        }
        
        // Arricchisci l'analisi con informazioni di sentiment se disponibili
        if (sentimentData) {
            analysisHTML = enrichAnalysisWithSentiment(analysisHTML, sentimentData);
            
            // Aggiusta la raccomandazione in base al sentiment
            recommendation = adjustRecommendationWithSentiment(recommendation, sentimentData);
            Logger.info(`Raccomandazione adattata con sentiment: ${recommendation}`);
        }
        
        // Visualizza risultato formattato
        aiOutput.innerHTML = formatAnalysisText(analysisHTML);
        
        // Genera l'ordine MT4 basato sull'analisi
        generateOrder(recommendation);
        
        Logger.info(`Analisi AI completata con successo per ${latestData.symbol}`);
    } catch (error) {
        // Gestione errori API
        showError("aiAnalysisOutput", `Errore nella generazione dell'analisi AI: ${error.message}`);
        Logger.error("Errore durante l'analisi AI:", { error: error.message, symbol: latestData.symbol });
    }
}

/**
 * Genera un ordine MT4 basato sulla raccomandazione
 * @param {string} recommendation - Raccomandazione generata dall'analisi
 */
function generateOrder(recommendation) {
    if (!latestData || !recommendation) {
        return;
    }
    
    Logger.info(`Generazione ordine per ${latestData.symbol} basato su raccomandazione: ${recommendation}`);
    
    // Configurazioni account di esempio (in produzione, verrebbero dal database utente)
    const accountInfo = {
        balance: 10000,      // Saldo conto
        currency: "USD",     // Valuta conto
        leverage: 100,       // Leva finanziaria
        openPositions: [],   // Posizioni aperte
        lastDrawdown: 0.02,  // Ultimo drawdown massimo (2%)
        brokerName: "Demo Broker"
    };
    
    try {
        // Genera un ordine MT4 basato sulla raccomandazione
        generatedOrder = generateMT4Order(latestData, recommendation, accountInfo);
        
        // Valida i dati dell'ordine generato
        if (generatedOrder && generatedOrder.valid && !validateOrderData(generatedOrder)) {
            Logger.warn(`Ordine generato non valido:`, generatedOrder);
            generatedOrder.valid = false;
            generatedOrder.message = "Ordine generato non valido: controllare i parametri.";
        }
        
        // Mostra il riepilogo dell'ordine solo se valido
        const orderSummaryContainer = document.getElementById("orderSummaryContainer");
        const orderSummaryOutput = document.getElementById("orderSummaryOutput");
        
        orderSummaryContainer.style.display = "block";
        
        if (generatedOrder.valid) {
            // Genera report di money management
            const moneyManagementReport = generateMoneyManagementReport(accountInfo, latestData.tradingProfile.name);
            
            // Visualizza ordine e rapporto money management
            const orderSummary = generateOrderSummary(generatedOrder);
            displayOrderSummary(orderSummary, moneyManagementReport);
            
            Logger.info(`Ordine generato con successo:`, {
                symbol: generatedOrder.symbol,
                tipo: generatedOrder.orderType,
                prezzo: generatedOrder.entryPrice,
                stopLoss: generatedOrder.stopLoss,
                target: generatedOrder.targetPrice,
                rr: generatedOrder.riskRewardRatio
            });
        } else {
            // Mostra messaggio se l'ordine non può essere generato
            orderSummaryOutput.innerHTML = `<div class="warning-message">⚠️ ${generatedOrder.message}</div>`;
            Logger.warn(`Impossibile generare ordine: ${generatedOrder.message}`);
        }
    } catch (error) {
        Logger.error("Errore nella generazione dell'ordine:", { error: error.message, symbol: latestData.symbol });
        const orderSummaryContainer = document.getElementById("orderSummaryContainer");
        const orderSummaryOutput = document.getElementById("orderSummaryOutput");
        
        orderSummaryContainer.style.display = "block";
        orderSummaryOutput.innerHTML = `<div class="error-message"><span class="error-icon">❌</span> Errore nella generazione dell'ordine: ${error.message}</div>`;
    }
}

/**
 * Funzione per copiare l'ordine MT4 negli appunti
 */
function copyOrderToClipboard() {
    if (!generatedOrder || !generatedOrder.valid) {
        Logger.warn("Tentativo di copia ordine non valido");
        alert("Nessun ordine valido da copiare!");
        return;
    }
    
    try {
        // Copia il comando MT4 negli appunti
        const textArea = document.createElement("textarea");
        textArea.value = generatedOrder.mt4Command;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        
        // Mostra messaggio di conferma
        alert("Comando MT4 copiato negli appunti!");
        Logger.info("Comando MT4 copiato negli appunti", { symbol: generatedOrder.symbol });
    } catch (error) {
        Logger.error("Errore durante la copia negli appunti:", { error: error.message });
        alert("Errore durante la copia: " + error.message);
    }
}

/**
 * Funzione per pulire manualmente la cache
 */
function clearCache() {
    APICache.clear();
    Logger.info("Cache pulita manualmente");
    alert("Cache pulita con successo!");
}

// Esponi funzioni e variabili utili
export { 
    latestData, 
    marketContext, 
    updateProfileInfo, 
    fetchAllData, 
    runAIAnalysis, 
    fetchSentimentAnalysis, 
    copyOrderToClipboard,
    clearCache
};
