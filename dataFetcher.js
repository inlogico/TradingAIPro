/**
 * Modulo per il recupero dati API con gestione errori, validazione e caching
 */

import { API_KEY, API_ENDPOINTS, PPLX_API_KEY, AI_CONFIG } from './config.js';
import APICache from './caching.js';
import Logger from './advanced-logger.js';
import { validateAssetData, validateTechnicalData, validateSentimentData } from './validation.js';

/**
 * Funzione generica per effettuare chiamate API con caching
 * @param {string} url - URL dell'endpoint API
 * @param {string} cacheKey - Chiave per memorizzare/recuperare dalla cache
 * @param {boolean} forceRefresh - Forza il refresh ignorando la cache
 * @returns {Promise<Object>} - I dati JSON dalla risposta
 */
async function fetchWithCache(url, cacheKey, forceRefresh = false) {
    try {
        // Verifica se i dati sono in cache (se non è richiesto un refresh forzato)
        if (!forceRefresh) {
            const cachedData = APICache.get(cacheKey);
            if (cachedData) {
                Logger.debug(`Utilizzati dati in cache per ${cacheKey}`);
                return cachedData;
            }
        }
        
        // Se dati non in cache o refresh forzato, recupera da API
        Logger.debug(`Fetching: ${url}`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Errore API: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Salva in cache
        APICache.set(cacheKey, data);
        
        return data;
    } catch (error) {
        Logger.error("Errore nel recupero dati:", { url, error: error.message });
        throw error;
    }
}

/**
 * Recupera i dati storici del prezzo per un simbolo
 * @param {string} symbol - Simbolo dello strumento finanziario
 * @param {string} timeframe - Intervallo temporale (1min, 5min, daily, etc)
 * @param {number} limit - Numero massimo di record da recuperare
 * @param {boolean} forceRefresh - Forza il refresh ignorando la cache
 * @returns {Promise<Array>} - Array di dati storici dei prezzi
 */
export async function fetchHistoricalPrices(symbol, timeframe, limit = 100, forceRefresh = false) {
    let url;
    const cacheKey = `historical_${symbol}_${timeframe}_${limit}`;
    
    // Per timeframe giornalieri, settimanali o mensili usa l'endpoint historical-price-eod
    if (timeframe === "daily" || timeframe === "weekly" || timeframe === "monthly") {
        url = `${API_ENDPOINTS.baseUrl}/historical-price-eod/full?symbol=${symbol}&apikey=${API_KEY}`;
    } else {
        // Per timeframe intraday (1min, 5min, ecc.) usa historical-chart
        url = `${API_ENDPOINTS.baseUrl}/historical-chart/${timeframe}/${symbol}?apikey=${API_KEY}&limit=${limit}`;
    }
    
    try {
        const data = await fetchWithCache(url, cacheKey, forceRefresh);
        
        // Gestisci i diversi formati di risposta tra gli endpoint
        if (timeframe === "daily" || timeframe === "weekly" || timeframe === "monthly") {
            if (!data.historical || !Array.isArray(data.historical)) {
                throw new Error(`Formato di risposta non valido per ${symbol} (timeframe: ${timeframe})`);
            }
            
            const result = data.historical.slice(0, limit).reverse();
            
            return result;
        } else {
            if (!Array.isArray(data)) {
                throw new Error(`Formato di risposta non valido per ${symbol} (timeframe: ${timeframe})`);
            }
            
            const result = data.slice(0, limit).reverse();
            
            return result;
        }
    } catch (error) {
        Logger.error(`Errore nel recupero dei dati storici:`, { symbol, timeframe, error: error.message });
        
        // Ritorna un array vuoto come fallback
        return [];
    }
}

/**
 * Recupera il profilo dell'azienda
 * @param {string} symbol - Simbolo dello strumento finanziario
 * @param {boolean} forceRefresh - Forza il refresh ignorando la cache
 * @returns {Promise<Object>} - Dati del profilo aziendale
 */
export async function fetchCompanyProfile(symbol, forceRefresh = false) {
    const url = `${API_ENDPOINTS.baseUrl}/profile/${symbol}?apikey=${API_KEY}`;
    const cacheKey = `profile_${symbol}`;
    
    try {
        const data = await fetchWithCache(url, cacheKey, forceRefresh);
        
        if (!Array.isArray(data) || data.length === 0) {
            Logger.warn(`Nessun dato di profilo trovato per ${symbol}`);
            return null;
        }
        
        // Valida i dati del profilo
        const profile = data[0];
        if (!validateAssetData(profile)) {
            Logger.warn(`Dati di profilo non validi per ${symbol}`);
            return null;
        }
        
        return profile;
    } catch (error) {
        Logger.error(`Errore nel recupero del profilo aziendale:`, { symbol, error: error.message });
        return null;
    }
}

/**
 * Recupera il logo dell'azienda
 * @param {string} symbol - Simbolo dello strumento finanziario
 * @returns {Promise<string>} - URL del logo o null se non disponibile
 */
export async function fetchCompanyLogo(symbol) {
    try {
        // Utilizza l'endpoint diretto per i loghi
        return `https://financialmodelingprep.com/image-stock/${symbol}.png?apikey=${API_KEY}`;
    } catch (error) {
        Logger.error(`Errore nel recupero del logo:`, { symbol, error: error.message });
        return null;
    }
}

/**
 * Recupera indicatori tecnici da FMP
 * @param {string} symbol - Simbolo dello strumento finanziario
 * @param {string} timeframe - Intervallo temporale
 * @param {string} indicator - Tipo di indicatore (rsi, sma, etc)
 * @param {number} period - Periodo dell'indicatore
 * @param {boolean} forceRefresh - Forza il refresh ignorando la cache
 * @returns {Promise<Array>} - Array di dati dell'indicatore tecnico
 */
export async function fetchTechnicalIndicator(symbol, timeframe, indicator, period, forceRefresh = false) {
    const url = `${API_ENDPOINTS.baseUrl}/technical_indicator/${timeframe}/${symbol}?type=${indicator}&period=${period}&apikey=${API_KEY}`;
    const cacheKey = `indicator_${symbol}_${timeframe}_${indicator}_${period}`;
    
    try {
        const data = await fetchWithCache(url, cacheKey, forceRefresh);
        
        if (!Array.isArray(data)) {
            Logger.warn(`Formato non valido per indicatore tecnico ${indicator}:`, { symbol, timeframe, period });
            return [];
        }
        
        // Valida i dati tecnici
        if (!validateTechnicalData(data)) {
            Logger.warn(`Dati tecnici non validi per ${symbol}:`, { indicator, timeframe, period });
            return [];
        }
        
        return data.reverse();
    } catch (error) {
        Logger.error(`Errore nel recupero dell'indicatore tecnico:`, { 
            symbol, timeframe, indicator, period, error: error.message 
        });
        return [];
    }
}

/**
 * Recupera i dati per il contesto di mercato generale
 * @param {boolean} forceRefresh - Forza il refresh ignorando la cache
 * @returns {Promise<Object>} - Dati sul contesto di mercato
 */
export async function fetchMarketContext(forceRefresh = false) {
    try {
        // Recupera indice S&P 500 come proxy per il sentiment del mercato generale
        const url = `${API_ENDPOINTS.baseUrl}/historical-price-eod/full?symbol=SPY&apikey=${API_KEY}`;
        const cacheKey = `market_context_spy`;
        
        const spyData = await fetchWithCache(url, cacheKey, forceRefresh);
        
        if (!spyData || !spyData.historical || spyData.historical.length === 0) {
            Logger.warn("Nessun dato disponibile per il contesto di mercato (SPY)");
            return {
                spyTrend: "neutrale",
                spyChangePercent: "0.00",
                marketVolatility: 15 // Valore predefinito moderato
            };
        }
        
        const recentPrices = spyData.historical.slice(0, 10).reverse();
        const latestPrice = recentPrices[recentPrices.length - 1].close;
        const prevPrice = recentPrices[0].close;
        
        const marketContext = {};
        marketContext.spyTrend = latestPrice > prevPrice ? "rialzista" : "ribassista";
        marketContext.spyChangePercent = ((latestPrice - prevPrice) / prevPrice * 100).toFixed(2);
        
        // Calcola la volatilità del mercato
        const returns = [];
        for (let i = 1; i < recentPrices.length; i++) {
            returns.push((recentPrices[i].close / recentPrices[i-1].close) - 1);
        }
        
        const avgReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length;
        const squaredDiffs = returns.map(r => Math.pow(r - avgReturn, 2));
        marketContext.marketVolatility = Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / squaredDiffs.length) * 100;
        
        Logger.info("Contesto di mercato recuperato con successo", marketContext);
        
        return marketContext;
    } catch (error) {
        Logger.error("Errore nel recupero del contesto di mercato:", { error: error.message });
        
        // Ritorna valori predefiniti in caso di errore
        return {
            spyTrend: "neutrale",
            spyChangePercent: "0.00",
            marketVolatility: 15
        };
    }
}

/**
 * Recupera i dati di sentiment per un simbolo
 * @param {string} symbol - Simbolo dello strumento finanziario
 * @param {boolean} forceRefresh - Forza il refresh ignorando la cache
 * @returns {Promise<Object>} - Dati di sentiment
 */
export async function fetchSentimentData(symbol, forceRefresh = false) {
    try {
        // Recupera dati di sentiment social
        const socialUrl = `${API_ENDPOINTS.baseUrl}/social-sentiment/trending/${symbol}?apikey=${API_KEY}`;
        const socialCacheKey = `sentiment_social_${symbol}`;
        const socialData = await fetchWithCache(socialUrl, socialCacheKey, forceRefresh);
        
        // Recupera dati di sentiment dalle news
        const newsUrl = `${API_ENDPOINTS.baseUrl}/stock-news-sentiments-rss-feed/${symbol}?limit=20&apikey=${API_KEY}`;
        const newsCacheKey = `sentiment_news_${symbol}`;
        const newsData = await fetchWithCache(newsUrl, newsCacheKey, forceRefresh);
        
        // Recupera opinioni degli analisti
        const analystUrl = `${API_ENDPOINTS.baseUrl}/analyst-stock-recommendations/${symbol}?apikey=${API_KEY}`;
        const analystCacheKey = `sentiment_analyst_${symbol}`;
        const analystData = await fetchWithCache(analystUrl, analystCacheKey, forceRefresh);
        
        // Processa e integra i dati di sentiment
        let sentimentSocial = 0;
        let socialVolume = 0;
        
        if (Array.isArray(socialData)) {
            // Calcola il sentiment medio dai dati social
            socialData.forEach(item => {
                // Converti il sentiment in valore numerico
                if (item.sentiment) {
                    if (typeof item.sentiment === 'number') {
                        sentimentSocial += item.sentiment;
                    } else if (typeof item.sentiment === 'string') {
                        if (item.sentiment.toLowerCase().includes('bullish')) {
                            sentimentSocial += 0.5;
                        } else if (item.sentiment.toLowerCase().includes('bearish')) {
                            sentimentSocial -= 0.5;
                        }
                    }
                    socialVolume++;
                }
            });
        }
        
        let sentimentNews = 0;
        let newsVolume = 0;
        
        if (Array.isArray(newsData)) {
            // Calcola il sentiment medio dalle news
            newsData.forEach(item => {
                if (item.sentiment) {
                    sentimentNews += parseFloat(item.sentiment);
                    newsVolume++;
                }
            });
        }
        
        // Analizza opinioni degli analisti
        let analystConsensus = "Neutrale";
        let priceTarget = null;
        
        if (Array.isArray(analystData) && analystData.length > 0) {
            const latestEstimate = analystData[0];
            
            // Calcola il consensus
            const strongBuy = latestEstimate.strongBuy || 0;
            const buy = latestEstimate.buy || 0;
            const hold = latestEstimate.hold || 0;
            const sell = latestEstimate.sell || 0;
            const strongSell = latestEstimate.strongSell || 0;
            
            const totalRatings = strongBuy + buy + hold + sell + strongSell;
            
            if (totalRatings > 0) {
                const buyRatio = (strongBuy + buy) / totalRatings;
                const sellRatio = (strongSell + sell) / totalRatings;
                
                if (buyRatio > 0.7) {
                    analystConsensus = "Fortemente Positivo";
                } else if (buyRatio > 0.5) {
                    analystConsensus = "Positivo";
                } else if (sellRatio > 0.7) {
                    analystConsensus = "Fortemente Negativo";
                } else if (sellRatio > 0.5) {
                    analystConsensus = "Negativo";
                }
            }
            
            // Recupera target price (ipotetico)
            if (latestEstimate.priceTarget) {
                priceTarget = {
                    priceTarget: latestEstimate.priceTarget,
                    targetHigh: latestEstimate.priceTarget * 1.1,
                    targetLow: latestEstimate.priceTarget * 0.9
                };
            }
        }
        
        // Normalizza i valori di sentiment
        const socialSentimentNormalized = socialVolume > 0 ? sentimentSocial / socialVolume * 10 : 0;
        const newsSentimentNormalized = newsVolume > 0 ? sentimentNews / newsVolume * 10 : 0;
        
        // Calcola sentiment composito
        const compositeSentiment = socialVolume + newsVolume > 0 ? 
            (socialSentimentNormalized * socialVolume + newsSentimentNormalized * newsVolume) / (socialVolume + newsVolume) : 
            0;
        
        // Determina etichetta sentiment
        let sentimentLabel;
        if (compositeSentiment > 5) {
            sentimentLabel = "Molto Positivo";
        } else if (compositeSentiment > 2) {
            sentimentLabel = "Positivo";
        } else if (compositeSentiment > 0) {
            sentimentLabel = "Leggermente Positivo";
        } else if (compositeSentiment > -2) {
            sentimentLabel = "Leggermente Negativo";
        } else if (compositeSentiment > -5) {
            sentimentLabel = "Negativo";
        } else {
            sentimentLabel = "Molto Negativo";
        }
        
        // Costruisci risultato finale
        const result = {
            symbol,
            timestamp: Date.now(),
            compositeSentiment: {
                score: compositeSentiment,
                label: sentimentLabel,
                confidence: socialVolume + newsVolume > 10 ? "Alta" : socialVolume + newsVolume > 5 ? "Media" : "Bassa"
            },
            analystRatings: {
                consensus: analystConsensus,
                priceTarget: priceTarget,
                distribution: {
                    buy: buy || 0,
                    hold: hold || 0,
                    sell: sell || 0
                }
            },
            socialSentiment: {
                score: socialSentimentNormalized,
                label: socialSentimentNormalized > 0 ? "Positivo" : socialSentimentNormalized < 0 ? "Negativo" : "Neutrale",
                volume: Math.min(10, socialVolume / 5) // Normalizza su scala 0-10
            },
            newsSentiment: {
                score: newsSentimentNormalized,
                label: newsSentimentNormalized > 0 ? "Positivo" : newsSentimentNormalized < 0 ? "Negativo" : "Neutrale",
                volume: Math.min(10, newsVolume / 2) // Normalizza su scala 0-10
            },
            insiderTrend: "Neutrale", // Placeholder, in un'implementazione reale andrebbe recuperato da API
            sentimentMetrics: {
                volatilityImpact: Math.abs(compositeSentiment) > 5 ? "Alto" : Math.abs(compositeSentiment) > 2 ? "Medio" : "Basso",
                momentumSignal: compositeSentiment > 3 ? "Rialzo" : compositeSentiment < -3 ? "Ribasso" : "Neutrale",
                convictionLevel: socialVolume + newsVolume > 15 ? "Alto" : socialVolume + newsVolume > 5 ? "Medio" : "Basso"
            }
        };
        
        // Valida i dati di sentiment
        if (!validateSentimentData(result)) {
            Logger.warn(`Dati di sentiment non validi per ${symbol}`);
            // Continua comunque con i dati disponibili
        }
        
        Logger.info(`Dati di sentiment recuperati con successo per ${symbol}`);
        
        return result;
    } catch (error) {
        Logger.error(`Errore nel recupero dei dati di sentiment:`, { symbol, error: error.message });
        
        // Ritorna dati di fallback in caso di errore
        return {
            symbol,
            timestamp: Date.now(),
            compositeSentiment: {
                score: 0,
                label: "Neutrale",
                confidence: "Bassa"
            },
            analystRatings: {
                consensus: "Neutrale",
                priceTarget: null,
                distribution: {
                    buy: 0,
                    hold: 0,
                    sell: 0
                }
            },
            socialSentiment: {
                score: 0,
                label: "Neutrale",
                volume: 0
            },
            newsSentiment: {
                score: 0,
                label: "Neutrale",
                volume: 0
            },
            insiderTrend: "Neutrale",
            sentimentMetrics: {
                volatilityImpact: "Basso",
                momentumSignal: "Neutrale",
                convictionLevel: "Basso"
            }
        };
    }
}

/**
 * Recupera i price target degli analisti per un simbolo
 * @param {string} symbol - Simbolo dello strumento finanziario
 * @param {boolean} forceRefresh - Forza il refresh ignorando la cache
 * @returns {Promise<Object>} - Dati sul price target
 */
export async function fetchPriceTarget(symbol, forceRefresh = false) {
    const url = `${API_ENDPOINTS.baseUrl}/price-target/${symbol}?apikey=${API_KEY}`;
    const cacheKey = `price_target_${symbol}`;
    
    try {
        const data = await fetchWithCache(url, cacheKey, forceRefresh);
        
        if (!Array.isArray(data) || data.length === 0) {
            Logger.warn(`Nessun dato di price target trovato per ${symbol}`);
            return null;
        }
        
        // Prendi i dati più recenti
        const latestTarget = data[0];
        
        return {
            priceTarget: latestTarget.priceTarget,
            targetHigh: latestTarget.targetHigh,
            targetLow: latestTarget.targetLow,
            numberOfAnalysts: latestTarget.numberOfAnalysts,
            lastUpdated: new Date(latestTarget.updatedDate).toISOString()
        };
    } catch (error) {
        Logger.error(`Errore nel recupero del price target:`, { symbol, error: error.message });
        return null;
    }
}

/**
 * Recupera le raccomandazioni degli analisti per un simbolo
 * @param {string} symbol - Simbolo dello strumento finanziario
 * @param {boolean} forceRefresh - Forza il refresh ignorando la cache
 * @returns {Promise<Object>} - Dati sulle raccomandazioni
 */
export async function fetchAnalystRecommendations(symbol, forceRefresh = false) {
    const url = `${API_ENDPOINTS.baseUrl}/analyst-stock-recommendations/${symbol}?apikey=${API_KEY}`;
    const cacheKey = `recommendations_${symbol}`;
    
    try {
        const data = await fetchWithCache(url, cacheKey, forceRefresh);
        
        if (!Array.isArray(data) || data.length === 0) {
            Logger.warn(`Nessun dato di raccomandazione trovato per ${symbol}`);
            return null;
        }
        
        // Prendi i dati più recenti
        const latestRec = data[0];
        
        // Calcola la raccomandazione complessiva
        const strongBuy = latestRec.strongBuy || 0;
        const buy = latestRec.buy || 0;
        const hold = latestRec.hold || 0;
        const sell = latestRec.sell || 0;
        const strongSell = latestRec.strongSell || 0;
        
        const totalAnalysts = strongBuy + buy + hold + sell + strongSell;
        const buyRatio = totalAnalysts > 0 ? (strongBuy + buy) / totalAnalysts : 0;
        const sellRatio = totalAnalysts > 0 ? (sell + strongSell) / totalAnalysts : 0;
        
        let recommendation;
        let confidence;
        
        if (buyRatio > 0.7) {
            recommendation = "Compra Forte";
            confidence = "Alta";
        } else if (buyRatio > 0.5) {
            recommendation = "Compra";
            confidence = buyRatio > 0.6 ? "Media" : "Bassa";
        } else if (sellRatio > 0.7) {
            recommendation = "Vendi Forte";
            confidence = "Alta";
        } else if (sellRatio > 0.5) {
            recommendation = "Vendi";
            confidence = sellRatio > 0.6 ? "Media" : "Bassa";
        } else {
            recommendation = "Mantieni";
            confidence = "Media";
        }
        
        return {
            recommendation,
            confidence,
            buyRatio,
            sellRatio,
            holdRatio: totalAnalysts > 0 ? hold / totalAnalysts : 0,
            totalAnalysts,
            lastUpdated: latestRec.date
        };
    } catch (error) {
        Logger.error(`Errore nel recupero delle raccomandazioni:`, { symbol, error: error.message });
        return null;
    }
}

/**
 * Genera un'analisi AI dei dati tecnici tramite Perplexity API
 * @param {Object} params - Oggetto con tutti i dati tecnici
 * @returns {Promise<string>} - Testo dell'analisi generata
 */
export async function generateAIAnalysis(params) {
    const { symbol, companyInfo, timeframe, lookbackPeriods, technicalIndicators, marketContext, tradingProfile, sentimentData } = params;
    
    try {
        // Determina il contesto temporale
        const timeframeText = CONFIG.timeframes[timeframe] || "breve termine";
        
        // Genera un prompt dettagliato con tutti i dati tecnici e di sentiment
        const prompt = `Analizza i seguenti dati tecnici e di sentiment per ${companyInfo.name} (${symbol}) e fornisci una valutazione dettagliata con una raccomandazione operativa chiara (Compra Forte, Compra, Mantieni, Vendi, Vendi Forte) adatta a un trader che utilizza il profilo "${tradingProfile.name}" (${tradingProfile.icon}) con orizzonte temporale: ${tradingProfile.horizon}.

L'analisi deve essere interamente in italiano, precisa e orientata all'azione con massima accuratezza predittiva.

PROFILO DI TRADING:
- Nome: ${tradingProfile.name} ${tradingProfile.icon}
- Orizzonte: ${tradingProfile.horizon}
- Caratteristiche: ${tradingProfile.characteristics.join(', ')}
- Timeframe: ${timeframe}

DATI FONDAMENTALI:
- Nome: ${companyInfo.name}
- Simbolo: ${symbol}
- Settore: ${companyInfo.sector}
- Industry: ${companyInfo.industry}
- Beta: ${companyInfo.beta}
- Capitalizzazione: ${(companyInfo.mktCap / 1000000000).toFixed(2)}B USD

CONTESTO DI MERCATO:
- Trend generale S&P 500: ${marketContext.spyTrend || 'N/D'} (${marketContext.spyChangePercent || 'N/D'}%)
- Volatilità mercato: ${marketContext.marketVolatility?.toFixed(2) || 'N/D'}%
- Correlazione con mercato: ${companyInfo.beta > 1.3 ? "Alta" : companyInfo.beta < 0.7 ? "Bassa" : "Media"}

DATI DI PREZZO:
- Prezzo attuale: $${technicalIndicators.priceData.current.toFixed(2)}
- Variazione: ${technicalIndicators.priceData.change > 0 ? '+' : ''}${technicalIndicators.priceData.change.toFixed(2)}%
- Range giornaliero: $${technicalIndicators.priceData.low.toFixed(2)} - $${technicalIndicators.priceData.high.toFixed(2)}
- Distanza da massimi a 52 settimane: ${calculatePercentFromHigh(technicalIndicators) || 'N/D'}%
- Distanza da minimi a 52 settimane: ${calculatePercentFromLow(technicalIndicators) || 'N/D'}%

INDICATORI DI TREND:
- SMA(${technicalIndicators.movingAverages.periods.short}): $${technicalIndicators.movingAverages.smaShort?.toFixed(2) || 'N/D'} (${technicalIndicators.priceData.current > technicalIndicators.movingAverages.smaShort ? 'sopra' : 'sotto'})
- SMA(${technicalIndicators.movingAverages.periods.medium}): $${technicalIndicators.movingAverages.smaMedium?.toFixed(2) || 'N/D'} (${technicalIndicators.priceData.current > technicalIndicators.movingAverages.smaMedium ? 'sopra' : 'sotto'})
- SMA(${technicalIndicators.movingAverages.periods.long}): $${technicalIndicators.movingAverages.smaLong?.toFixed(2) || 'N/D'} (${technicalIndicators.priceData.current > technicalIndicators.movingAverages.smaLong ? 'sopra' : 'sotto'})
- EMA(20): $${technicalIndicators.movingAverages.ema20?.toFixed(2) || 'N/D'} (${technicalIndicators.priceData.current > technicalIndicators.movingAverages.ema20 ? 'sopra' : 'sotto'})
- Incrocio SMA recente: ${detectCrossovers(technicalIndicators) || 'nessuno'}
- ADX: ${technicalIndicators.trend.adx?.toFixed(2) || 'N/D'} (${technicalIndicators.trend.adx > 25 ? 'trend forte' : 'trend debole'})
- +DI: ${technicalIndicators.trend.plusDI?.toFixed(2) || 'N/D'}
- -DI: ${technicalIndicators.trend.minusDI?.toFixed(2) || 'N/D'}

INDICATORI DI MOMENTUM:
- RSI(${technicalIndicators.momentum.rsiPeriod}): ${technicalIndicators.momentum.rsi?.toFixed(2) || 'N/D'} (${
    technicalIndicators.momentum.rsi > 70 ? 'ipercomprato' : 
    technicalIndicators.momentum.rsi < 30 ? 'ipervenduto' : 'neutrale'
})
- Divergenza RSI: ${detectRSIDivergence(technicalIndicators) || 'nessuna'}
- MACD: ${technicalIndicators.momentum.macd?.toFixed(4) || 'N/D'}
- MACD Signal: ${technicalIndicators.momentum.macdSignal?.toFixed(4) || 'N/D'}
- MACD Histogram: ${technicalIndicators.momentum.macdHistogram?.toFixed(4) || 'N/D'} (${
    technicalIndicators.momentum.macdHistogram > 0 ? 'positivo' : 
    technicalIndicators.momentum.macdHistogram < 0 ? 'negativo' : 'neutrale'
})
- Direzione MACD: ${detectMACDTrend(technicalIndicators) || 'N/D'}

VOLATILITÀ E RANGE:
- Volatilità (deviazione standard): ${technicalIndicators.volatility.value}%
- Confronto con volatilità storica: ${compareHistoricalVolatility(technicalIndicators) || 'N/D'}
- Bollinger Upper Band: $${technicalIndicators.volatility.bollingerUpper?.toFixed(2) || 'N/D'}
- Bollinger Middle Band: $${technicalIndicators.volatility.bollingerMiddle?.toFixed(2) || 'N/D'}
- Bollinger Lower Band: $${technicalIndicators.volatility.bollingerLower?.toFixed(2) || 'N/D'}
- Bollinger Bandwidth: ${technicalIndicators.volatility.bollingerWidth?.toFixed(2) || 'N/D'}%
- Posizione nel canale: ${calculateBollingerPosition(technicalIndicators) || 'N/D'}%

LIVELLI CHIAVE:
- Pivot Point: $${technicalIndicators.levels.pivotPoint.toFixed(2)}
- Resistenze: ${technicalIndicators.levels.resistances.slice(0, 3).map(r => '$' + r.toFixed(2)).join(', ')}
- Supporti: ${technicalIndicators.levels.supports.slice(0, 3).map(s => '$' + s.toFixed(2)).join(', ')}
- Distanza dal supporto più vicino: ${calculateNearestSupport(technicalIndicators) || 'N/D'}%
- Distanza dalla resistenza più vicina: ${calculateNearestResistance(technicalIndicators) || 'N/D'}%

VOLUME:
- Volume attuale: ${(technicalIndicators.volume.current / 1000000).toFixed(2)}M
- Volume medio: ${(technicalIndicators.volume.average / 1000000).toFixed(2)}M
- Variazione volume: ${technicalIndicators.volume.change > 0 ? '+' : ''}${technicalIndicators.volume.change.toFixed(2)}%
- Rapporto Volume/Media: ${(technicalIndicators.volume.current / technicalIndicators.volume.average).toFixed(2)}
- Trend volume recente: ${detectVolumeTrend(technicalIndicators) || 'N/D'}

PATTERN TECNICI IDENTIFICATI:
${technicalIndicators.trend.patterns.map(p => `- ${p.pattern}: ${p.direction || p.implication || ''} ${p.strength ? `(${p.strength})` : ''} ${p.price ? `a $${p.price.toFixed(2)}` : ''}`).join('\n')}

DATI DI SENTIMENT:
- Sentiment complessivo: ${sentimentData ? sentimentData.compositeSentiment.label : 'N/D'} (confidenza: ${sentimentData ? sentimentData.compositeSentiment.confidence : 'N/D'})
- Consensus analisti: ${sentimentData ? sentimentData.analystRatings.consensus : 'N/D'}
- Target price analisti: ${sentimentData && sentimentData.analystRatings.priceTarget ? '$' + sentimentData.analystRatings.priceTarget.priceTarget : 'N/D'}
- Sentiment news: ${sentimentData ? sentimentData.newsSentiment.label : 'N/D'} (volume: ${sentimentData ? sentimentData.newsSentiment.volume : 'N/D'})
- Sentiment social: ${sentimentData ? sentimentData.socialSentiment.label : 'N/D'} (volume: ${sentimentData ? sentimentData.socialSentiment.volume : 'N/D'}/10)
- Insider trading: ${sentimentData ? sentimentData.insiderTrend : 'N/D'}
- Segnale momentum: ${sentimentData ? sentimentData.sentimentMetrics.momentumSignal : 'N/D'}
- Livello convinzione: ${sentimentData ? sentimentData.sentimentMetrics.convictionLevel : 'N/D'}

CONTESTO DEL PROFILO DI TRADING "${tradingProfile.name}":
- Caratteristiche principali rilevanti per questa analisi: ${getProfileRelevantFeatures(tradingProfile, technicalIndicators) || 'N/D'}
- Indicatori più importanti per questo profilo: ${getProfileKeyIndicators(tradingProfile, technicalIndicators) || 'N/D'}
- Livello di rischio adatto al profilo: ${getProfileRiskLevel(tradingProfile) || 'N/D'}

Struttura la tua analisi in modo conciso e fattuale:
1. Situazione attuale del titolo nel contesto di mercato (3-4 frasi)
2. Analisi tecnica focalizzata su indicatori rilevanti per il profilo di trading ${tradingProfile.name} (5-7 frasi)
3. Valutazione della forza e direzione del trend in base all'orizzonte temporale ${tradingProfile.horizon} (3-4 frasi)
4. Pattern tecnici e livelli chiave da monitorare (3-4 frasi)
5. RACCOMANDAZIONE OPERATIVA in formato "RACCOMANDAZIONE: [Compra Forte/Compra/Mantieni/Vendi/Vendi Forte]" con spiegazione sintetica (1-2 frasi)
6. Obiettivo di prezzo (target) con scenario temporale e probabilità (esempio: "Obiettivo: $X.XX con probabilità 70% nel timeframe ${timeframe}")
7. Livello di stop loss consigliato con spiegazione tecnica (esempio: "Stop Loss: $X.XX basato su [supporto/media mobile/altro]")
8. Rapporto rischio/rendimento della posizione e conformità al profilo di trading

Fai emergere chiaramente il risultato della tua analisi senza ambiguità, basandoti sugli indicatori tecnici e di sentiment forniti. La raccomandazione deve essere precisa, giustificata tecnicamente e adatta al profilo di trading selezionato.`;

        Logger.debug("Generazione analisi AI via Perplexity con prompt dettagliato");
        
        // Chiamata API Perplexity con prompt di sistema migliorato e dati di sentiment
        try {
            const response = await fetch(API_ENDPOINTS.perplexity, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json',
                    'Authorization': `Bearer ${PPLX_API_KEY}`
                },
                body: JSON.stringify({
                    model: AI_CONFIG.model,
                    messages: [
                        { 
                            role: "system", 
                            content: AI_CONFIG.systemPrompt
                        },
                        { role: "user", content: prompt }
                    ],
                    max_tokens: AI_CONFIG.maxTokens,
                    temperature: AI_CONFIG.temperature
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                Logger.error(`Richiesta API Perplexity fallita: ${response.status} ${response.statusText}`, errorText);
                throw new Error(`Errore API Perplexity: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            Logger.info("Risposta API Perplexity ricevuta con successo");
            
            // Controllare se la risposta ha il formato atteso
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                Logger.error('Formato di risposta inaspettato dall\'API Perplexity', data);
                throw new Error('Formato di risposta inaspettato dall\'API Perplexity');
            }
            
            return data.choices[0].message.content;
        } catch (apiError) {
            Logger.error('Errore con l\'API Perplexity:', apiError.message);
            
            // In caso di errore API, genera una raccomandazione utilizzando l'algoritmo interno
            Logger.info("Generazione raccomandazione algoritmica di backup...");
            const recommendation = calculateWeightedRecommendation(technicalIndicators, tradingProfile.name.toLowerCase().replace(/\s+/g, ''));
            
            // Crea un'analisi semplificata utilizzando la raccomandazione algoritmica
            return generateBackupAnalysis(symbol, companyInfo, technicalIndicators, marketContext, tradingProfile, sentimentData, recommendation);
        }
    } catch (error) {
        Logger.error('Errore generale nella generazione dell\'analisi:', error.message);
        throw error;
    }
}

/**
 * Genera un'analisi di fallback in caso di errore con l'API Perplexity
 * Utilizza una logica algoritmica interna per generare una raccomandazione
 */
function generateBackupAnalysis(symbol, companyInfo, technicalIndicators, marketContext, tradingProfile, sentimentData, recommendation) {
    return `
## Analisi Tecnica Algoritmica (generata localmente)

**SITUAZIONE ATTUALE:**
${companyInfo.name} (${symbol}) mostra attualmente un prezzo di $${technicalIndicators.priceData.current.toFixed(2)} con una variazione di ${technicalIndicators.priceData.change > 0 ? '+' : ''}${technicalIndicators.priceData.change.toFixed(2)}% nel timeframe ${timeframe}. Il contesto di mercato è ${marketContext.spyTrend || 'neutrale'}.

**INDICATORI CHIAVE:**
- RSI(${technicalIndicators.momentum.rsiPeriod}): ${technicalIndicators.momentum.rsi?.toFixed(2) || 'N/D'} (${technicalIndicators.momentum.rsi > 70 ? 'ipercomprato' : technicalIndicators.momentum.rsi < 30 ? 'ipervenduto' : 'neutrale'})
- MACD: ${technicalIndicators.momentum.macd?.toFixed(4) || 'N/D'} (${technicalIndicators.momentum.macdHistogram > 0 ? 'positivo' : 'negativo'})
- ADX: ${technicalIndicators.trend.adx?.toFixed(2) || 'N/D'} (${technicalIndicators.trend.adx > 25 ? 'trend forte' : 'trend debole'})
- Posizione rispetto a SMA: ${technicalIndicators.priceData.current > technicalIndicators.movingAverages.smaMedium ? 'Sopra' : 'Sotto'} SMA(${technicalIndicators.movingAverages.periods.medium})

**SENTIMENT DI MERCATO:**
${sentimentData ? `- Sentiment complessivo: ${sentimentData.compositeSentiment.label}
- Consensus analisti: ${sentimentData.analystRatings.consensus}
- Sentiment news: ${sentimentData.newsSentiment.label}
- Sentiment social: ${sentimentData.socialSentiment.label}` : '- Dati di sentiment non disponibili'}

**LIVELLI CHIAVE:**
- Supporto più vicino: $${findNearestLevel(technicalIndicators.levels.supports, technicalIndicators.priceData.current)}
- Resistenza più vicina: $${findNearestLevel(technicalIndicators.levels.resistances, technicalIndicators.priceData.current)}

**RACCOMANDAZIONE: ${recommendation.recommendation}**
Livello di confidenza: ${recommendation.confidence}

**Obiettivo di prezzo:** $${calculatePriceTarget(technicalIndicators, recommendation.recommendation)}
**Stop Loss consigliato:** $${calculateStopLoss(technicalIndicators, recommendation.recommendation)}

**Rapporto Rischio/Rendimento:** ${calculateRiskRewardRatio(technicalIndicators, recommendation.recommendation)}
    `;
}

/**
 * Trova il livello (supporto o resistenza) più vicino al prezzo attuale
 * @param {Array<number>} levels - Array di livelli
 * @param {number} currentPrice - Prezzo attuale
 * @returns {string} - Il livello più vicino formattato
 */
function findNearestLevel(levels, currentPrice) {
    if (!levels || levels.length === 0) return currentPrice.toFixed(2);
    
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

// Importa funzioni da technicalUtils.js per evitare dipendenze circolari
import { 
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
    calculatePriceTarget,
    calculateStopLoss,
    calculateRiskRewardRatio
} from './technicalUtils.js';

import { 
    getProfileRelevantFeatures, 
    getProfileKeyIndicators, 
    getProfileRiskLevel 
} from './profileAnalysis.js';

import { calculateWeightedRecommendation } from './recommendationEngine.js';