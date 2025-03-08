/**
 * Modulo per l'analisi del sentiment e l'integrazione di fonti esterne
 * Recupera e analizza dati di sentiment da news, social media e opinioni degli analisti
 * Versione aggiornata: utilizza esclusivamente API di Financial Modeling Prep
 */

import { API_KEY, API_ENDPOINTS } from './config.js';

// Cache per le analisi di sentiment per ridurre le chiamate API
const sentimentCache = new Map();
const CACHE_DURATION = 3600000; // 1 ora in millisecondi

/**
 * Recupera l'analisi del sentiment per un simbolo specifico
 * @param {string} symbol - Simbolo dello strumento finanziario
 * @returns {Promise<Object>} - Dati di sentiment analizzati
 */
async function getSentimentAnalysis(symbol) {
    try {
        // Verifica se abbiamo dati in cache non scaduti
        const cacheKey = `sentiment_${symbol}`;
        const cachedData = sentimentCache.get(cacheKey);
        
        if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
            console.log(`Utilizzando dati di sentiment in cache per ${symbol}`);
            return cachedData.data;
        }
        
        console.log(`Recupero dati di sentiment per ${symbol}`);
        
        // Inizia a raccogliere dati da varie fonti in parallelo
        // Usa Promise.allSettled invece di Promise.all per gestire gli errori singolarmente
        const results = await Promise.allSettled([
            fetchAnalystOpinions(symbol),
            fetchNewsSentiment(symbol),
            fetchSocialMediaSentiment(symbol)
        ]);
        
        // Estrai i risultati, usando valori predefiniti in caso di errore
        const analystData = results[0].status === 'fulfilled' ? results[0].value : {
            consensus: "Neutrale",
            distribution: { buy: 0, hold: 0, sell: 0 },
            priceTarget: null
        };
        
        const newsSentiment = results[1].status === 'fulfilled' ? results[1].value : {
            score: 0,
            label: "Neutrale",
            volume: 0,
            trending: false,
            volatility: "media"
        };
        
        const socialSentiment = results[2].status === 'fulfilled' ? results[2].value : {
            score: 0,
            label: "Neutrale",
            volume: 0,
            trending: false,
            platforms: { reddit: 0, twitter: 0, stocktwits: 0 },
            keywords: []
        };
        
        // Calcola sentiment composito
        const compositeSentiment = calculateCompositeSentiment(
            analystData, 
            newsSentiment, 
            socialSentiment
        );
        
        // Ottieni la tendenza di insider trading
        const insiderTrend = await fetchInsiderTradingTrend(symbol);
        
        // Costruisci il risultato completo
        const result = {
            symbol,
            timestamp: Date.now(),
            compositeSentiment,
            analystRatings: analystData,
            newsSentiment,
            socialSentiment,
            insiderTrend,
            // Aggiungi metriche supplementari
            sentimentMetrics: {
                volatilityImpact: calculateVolatilityImpact(compositeSentiment, newsSentiment.volatility),
                momentumSignal: calculateMomentumSignal(newsSentiment, socialSentiment),
                convictionLevel: calculateConvictionLevel(analystData, insiderTrend)
            }
        };
        
        // Salva in cache per uso futuro
        sentimentCache.set(cacheKey, {
            timestamp: Date.now(),
            data: result
        });
        
        return result;
    } catch (error) {
        console.error(`Errore nell'analisi del sentiment:`, error);
        
        // Restituisci dati fallback in caso di errore
        return {
            symbol,
            timestamp: Date.now(),
            compositeSentiment: {
                score: 0,
                label: "Neutrale",
                confidence: "Bassa"
            },
            analystRatings: {
                consensus: "N/D",
                distribution: {},
                priceTarget: null
            },
            newsSentiment: {
                score: 0,
                volume: 0,
                trending: false
            },
            socialSentiment: {
                score: 0,
                volume: 0,
                trending: false
            },
            insiderTrend: "N/D",
            sentimentMetrics: {
                volatilityImpact: "N/D",
                momentumSignal: "N/D",
                convictionLevel: "N/D"
            },
            error: error.message
        };
    }
}

/**
 * Recupera le opinioni degli analisti da Financial Modeling Prep
 * @param {string} symbol - Simbolo dello strumento finanziario
 * @returns {Promise<Object>} - Dati delle opinioni degli analisti
 */
async function fetchAnalystOpinions(symbol) {
    try {
        const url = `${API_ENDPOINTS.baseUrl}/analyst-stock-recommendations/${symbol}?apikey=${API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Errore API analisti: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            return {
                consensus: "Neutrale",
                distribution: {
                    buy: 0,
                    hold: 0,
                    sell: 0
                },
                priceTarget: null
            };
        }
        
        // Estrai i dati più recenti
        const latestEstimate = data[0];
        
        // Calcola il consensus basato sulle raccomandazioni
        const strongBuy = latestEstimate.strongBuy || 0;
        const buy = latestEstimate.buy || 0;
        const hold = latestEstimate.hold || 0;
        const sell = latestEstimate.sell || 0;
        const strongSell = latestEstimate.strongSell || 0;
        
        const totalRatings = strongBuy + buy + hold + sell + strongSell;
        
        let consensus;
        const buyRatio = (strongBuy + buy) / totalRatings;
        const sellRatio = (strongSell + sell) / totalRatings;
        
        if (buyRatio > 0.7) {
            consensus = "Fortemente Positivo";
        } else if (buyRatio > 0.5) {
            consensus = "Positivo";
        } else if (sellRatio > 0.7) {
            consensus = "Fortemente Negativo";
        } else if (sellRatio > 0.5) {
            consensus = "Negativo";
        } else {
            consensus = "Neutrale";
        }
        
        // Ottieni il target price
        const targetPriceData = await fetchPriceTarget(symbol);
        
        return {
            consensus,
            distribution: {
                strongBuy,
                buy,
                hold,
                sell,
                strongSell
            },
            priceTarget: targetPriceData,
            lastUpdated: latestEstimate.date || null
        };
    } catch (error) {
        console.error(`Errore nel recupero delle opinioni degli analisti:`, error);
        return {
            consensus: "Neutrale",
            distribution: {
                buy: 0,
                hold: 0,
                sell: 0
            },
            priceTarget: null
        };
    }
}

/**
 * Recupera il target price degli analisti
 * @param {string} symbol - Simbolo dello strumento finanziario
 * @returns {Promise<Object>} - Dati sul target price
 */
async function fetchPriceTarget(symbol) {
    try {
        const url = `${API_ENDPOINTS.baseUrl}/price-target/${symbol}?apikey=${API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Errore API target price: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            return null;
        }
        
        const latestTarget = data[0];
        
        return {
            priceTarget: latestTarget.priceTarget,
            targetHigh: latestTarget.targetHigh,
            targetLow: latestTarget.targetLow,
            targetConsensus: latestTarget.targetConsensus,
            lastUpdated: latestTarget.updatedDate
        };
    } catch (error) {
        console.error(`Errore nel recupero del target price:`, error);
        return null;
    }
}

/**
 * Recupera il sentiment delle news usando FMP API
 * @param {string} symbol - Simbolo dello strumento finanziario
 * @returns {Promise<Object>} - Dati di sentiment delle news
 */
async function fetchNewsSentiment(symbol) {
    try {
        // Usa il nuovo endpoint di FMP per le news con sentiment
        const newsUrl = `${API_ENDPOINTS.baseUrl}/stock-news-sentiments-rss-feed/${symbol}?limit=20&apikey=${API_KEY}`;
        const response = await fetch(newsUrl);
        
        if (!response.ok) {
            throw new Error(`Errore API news sentiment: ${response.status}`);
        }
        
        const newsData = await response.json();
        
        if (!newsData || newsData.length === 0) {
            return {
                score: 0,
                label: "Neutrale",
                volume: 0,
                trending: false,
                volatility: "media"
            };
        }
        
        // Calcola il sentiment medio
        let totalSentiment = 0;
        let totalConfidence = 0;
        let newsCount = 0;
        let positiveNewsCount = 0;
        let negativeNewsCount = 0;
        
        // Calcola la distribuzione del sentiment nelle news
        newsData.forEach(item => {
            if (item.sentiment) {
                const sentiment = parseFloat(item.sentiment);
                const confidence = item.confidence ? parseFloat(item.confidence) : 0.5;
                
                totalSentiment += sentiment * confidence;
                totalConfidence += confidence;
                newsCount++;
                
                if (sentiment > 0.2) positiveNewsCount++;
                if (sentiment < -0.2) negativeNewsCount++;
            }
        });
        
        // Normalizza il punteggio di sentiment su una scala da -10 a 10
        const averageSentiment = totalConfidence > 0 ? 
            (totalSentiment / totalConfidence) * 10 : 0;
        
        // Determina l'etichetta di sentiment
        let label;
        if (averageSentiment > 5) {
            label = "Molto Positivo";
        } else if (averageSentiment > 2) {
            label = "Positivo";
        } else if (averageSentiment > 0) {
            label = "Leggermente Positivo";
        } else if (averageSentiment > -2) {
            label = "Leggermente Negativo";
        } else if (averageSentiment > -5) {
            label = "Negativo";
        } else {
            label = "Molto Negativo";
        }
        
        // Determina la volatilità basata sulla divergenza di opinioni
        let volatility;
        if (positiveNewsCount > 0 && negativeNewsCount > 0 && 
            Math.abs(positiveNewsCount - negativeNewsCount) < newsCount * 0.3) {
            volatility = "alta";
        } else if (newsCount > 10) {
            volatility = "media";
        } else {
            volatility = "bassa";
        }
        
        // Estrae un trend primario dalle news
        const primaryTrend = extractPrimaryTrend(newsData);
        
        return {
            score: averageSentiment,
            label: label,
            volume: newsCount,
            trending: newsCount > 5,
            volatility: volatility,
            primaryTrend: primaryTrend,
            headlines: newsData.slice(0, 3).map(item => ({
                title: item.title,
                source: item.site || item.source || '',
                date: item.publishedDate || item.date || ''
            }))
        };
    } catch (error) {
        console.error(`Errore nell'analisi del sentiment delle news:`, error);
        return {
            score: 0,
            label: "Neutrale",
            volume: 0,
            trending: false,
            volatility: "media"
        };
    }
}

/**
 * Estrae il trend primario dalle news
 * @param {Array<Object>} newsData - Dati delle news
 * @returns {string} - Trend primario identificato
 */
function extractPrimaryTrend(newsData) {
    if (!newsData || newsData.length === 0) return "Nessun trend identificato";
    
    // Semplice estrazione di parole chiave dai titoli
    const keywords = {};
    const stopwords = ['il', 'la', 'i', 'gli', 'le', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
                      'e', 'o', 'ma', 'se', 'perché', 'come', 'che', 'chi', 'cui', 'cosa'];
    
    newsData.forEach(item => {
        if (item.title) {
            // Tokenizza e normalizza le parole
            const words = item.title.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(word => word.length > 3 && !stopwords.includes(word));
            
            // Conta le occorrenze
            words.forEach(word => {
                if (keywords[word]) {
                    keywords[word]++;
                } else {
                    keywords[word] = 1;
                }
            });
        }
    });
    
    // Trova le parole più frequenti
    const sortedKeywords = Object.entries(keywords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(entry => entry[0]);
    
    if (sortedKeywords.length === 0) return "Nessun trend chiaro";
    
    // Costruisci una frase di trend
    const sentiment = newsData.reduce((acc, item) => acc + (parseFloat(item.sentiment) || 0), 0) / newsData.length;
    
    const trendDirection = sentiment > 0.2 ? "rialzista" : 
                          sentiment < -0.2 ? "ribassista" : "laterale";
    
    return `Trend ${trendDirection} con focus su ${sortedKeywords.join(', ')}`;
}

/**
 * Recupera il sentiment dai social media usando FMP API
 * @param {string} symbol - Simbolo dello strumento finanziario
 * @returns {Promise<Object>} - Dati di sentiment social
 */
async function fetchSocialMediaSentiment(symbol) {
    try {
        // Usa l'endpoint Social Sentiment Trending di FMP
        const socialUrl = `${API_ENDPOINTS.baseUrl}/social-sentiment/trending/${symbol}?apikey=${API_KEY}`;
        const response = await fetch(socialUrl);
        
        if (!response.ok) {
            throw new Error(`Errore API social sentiment: ${response.status}`);
        }
        
        const socialData = await response.json();
        
        if (!socialData || !Array.isArray(socialData) || socialData.length === 0) {
            return {
                score: 0,
                label: "Neutrale",
                volume: 0,
                trending: false,
                platforms: {
                    reddit: 0,
                    twitter: 0,
                    stocktwits: 0
                },
                keywords: []
            };
        }
        
        // Separa i dati per piattaforma
        const platforms = {
            reddit: 0,
            twitter: 0,
            stocktwits: 0
        };
        
        // Calcola il sentiment medio per piattaforma
        let totalSentiment = 0;
        let totalMentions = 0;
        let positiveCount = 0;
        let negativeCount = 0;
        
        socialData.forEach(item => {
            // Converti il sentiment in un valore numerico
            let sentiment;
            
            if (typeof item.sentiment === 'number') {
                sentiment = item.sentiment;
            } else if (item.sentiment && typeof item.sentiment === 'string') {
                if (item.sentiment.toLowerCase().includes('bullish')) {
                    sentiment = 0.5; // Valore positivo
                    positiveCount++;
                } else if (item.sentiment.toLowerCase().includes('bearish')) {
                    sentiment = -0.5; // Valore negativo
                    negativeCount++;
                } else {
                    sentiment = 0; // Neutrale
                }
            } else {
                sentiment = 0;
            }
            
            // Aggiungi al totale
            totalSentiment += sentiment;
            totalMentions++;
            
            // Aggiorna il valore della piattaforma se disponibile
            if (item.source && typeof item.source === 'string') {
                const source = item.source.toLowerCase();
                if (source.includes('reddit')) {
                    platforms.reddit += sentiment;
                } else if (source.includes('twitter') || source.includes('x.com')) {
                    platforms.twitter += sentiment;
                } else if (source.includes('stocktwits')) {
                    platforms.stocktwits += sentiment;
                }
            }
        });
        
        // Normalizza il punteggio di sentiment su una scala da -10 a 10
        const averageSentiment = totalMentions > 0 ? (totalSentiment / totalMentions) * 10 : 0;
        
        // Determina l'etichetta di sentiment
        let label;
        if (averageSentiment > 5) {
            label = "Molto Positivo";
        } else if (averageSentiment > 2) {
            label = "Positivo";
        } else if (averageSentiment > 0) {
            label = "Leggermente Positivo";
        } else if (averageSentiment > -2) {
            label = "Leggermente Negativo";
        } else if (averageSentiment > -5) {
            label = "Negativo";
        } else {
            label = "Molto Negativo";
        }
        
        // Estrai le parole chiave più frequenti
        const keywords = extractSocialKeywords(socialData);
        
        // Determina se il titolo è trending
        const trending = totalMentions > 10 || (positiveCount + negativeCount) > 5;
        
        return {
            score: averageSentiment,
            label: label,
            volume: Math.min(10, totalMentions / 2), // Normalizza su scala 0-10
            trending: trending,
            platforms: platforms,
            keywords: keywords
        };
    } catch (error) {
        console.error(`Errore nell'analisi del sentiment social:`, error);
        return {
            score: 0,
            label: "Neutrale",
            volume: 0,
            trending: false,
            platforms: {
                reddit: 0,
                twitter: 0,
                stocktwits: 0
            },
            keywords: []
        };
    }
}

/**
 * Estrae le parole chiave dai dati social
 * @param {Array<Object>} socialData - Dati social
 * @returns {Array<string>} - Lista di parole chiave
 */
function extractSocialKeywords(socialData) {
    const keywords = {};
    const stopwords = ['il', 'la', 'i', 'gli', 'le', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
                      'e', 'o', 'ma', 'se', 'perché', 'come', 'che', 'chi', 'cui', 'cosa', 'the', 'a', 'an', 'of', 'in', 'for'];
    
    socialData.forEach(item => {
        if (item.text) {
            // Tokenizza e normalizza le parole
            const words = item.text.toLowerCase()
                .replace(/[^\w\s]/g, '')
                .split(/\s+/)
                .filter(word => word.length > 3 && !stopwords.includes(word));
            
            // Conta le occorrenze
            words.forEach(word => {
                if (keywords[word]) {
                    keywords[word]++;
                } else {
                    keywords[word] = 1;
                }
            });
        }
    });
    
    // Trova le parole più frequenti
    return Object.entries(keywords)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);
}

/**
 * Recupera la tendenza dell'insider trading
 * @param {string} symbol - Simbolo dello strumento finanziario
 * @returns {Promise<string>} - Tendenza dell'insider trading
 */
async function fetchInsiderTradingTrend(symbol) {
    try {
        const url = `${API_ENDPOINTS.baseUrl}/insider-trading?symbol=${symbol}&limit=10&apikey=${API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Errore API insider trading: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            return "Neutrale";
        }
        
        // Analizza gli ultimi 10 insider trades
        let buyVolume = 0;
        let sellVolume = 0;
        
        data.forEach(trade => {
            if (trade.acquistionOrDisposition === 'A') {
                buyVolume += trade.transactionShares || 0;
            } else if (trade.acquistionOrDisposition === 'D') {
                sellVolume += trade.transactionShares || 0;
            }
        });
        
        // Determina la tendenza
        if (buyVolume > sellVolume * 2) {
            return "Fortemente Positivo";
        } else if (buyVolume > sellVolume) {
            return "Positivo";
        } else if (sellVolume > buyVolume * 2) {
            return "Fortemente Negativo";
        } else if (sellVolume > buyVolume) {
            return "Negativo";
        } else {
            return "Neutrale";
        }
    } catch (error) {
        console.error(`Errore nel recupero dei dati insider:`, error);
        return "Neutrale";
    }
}

/**
 * Calcola il sentiment composito combinando varie fonti
 * @param {Object} analystData - Dati degli analisti
 * @param {Object} newsSentiment - Sentiment delle news
 * @param {Object} socialSentiment - Sentiment dei social media
 * @returns {Object} - Sentiment composito
 */
function calculateCompositeSentiment(analystData, newsSentiment, socialSentiment) {
    // Converti il consensus degli analisti in un punteggio numerico
    let analystScore = 0;
    switch (analystData.consensus) {
        case "Fortemente Positivo": analystScore = 10; break;
        case "Positivo": analystScore = 5; break;
        case "Neutrale": analystScore = 0; break;
        case "Negativo": analystScore = -5; break;
        case "Fortemente Negativo": analystScore = -10; break;
        default: analystScore = 0;
    }
    
    // Pesi per ciascuna fonte (personalizzabili)
    const weights = {
        analyst: 0.5,  // Analisti hanno il maggior peso
        news: 0.3,     // News sono importanti ma meno degli analisti
        social: 0.2    // Social hanno il minor peso ma possono cogliere trend emergenti
    };
    
    // Calcola il punteggio composito ponderato
    const compositeScore = (
        analystScore * weights.analyst +
        newsSentiment.score * weights.news +
        socialSentiment.score * weights.social
    );
    
    // Normalizza il punteggio tra -10 e +10
    const normalizedScore = Math.max(-10, Math.min(10, compositeScore));
    
    // Determina l'etichetta di sentiment
    let label;
    if (normalizedScore > 7) {
        label = "Molto Positivo";
    } else if (normalizedScore > 3) {
        label = "Positivo";
    } else if (normalizedScore > 0) {
        label = "Leggermente Positivo";
    } else if (normalizedScore > -3) {
        label = "Leggermente Negativo";
    } else if (normalizedScore > -7) {
        label = "Negativo";
    } else {
        label = "Molto Negativo";
    }
    
    // Calcola il livello di confidenza basato sulla coerenza tra le fonti
    // Se tutte le fonti sono d'accordo, la confidenza è alta
    const confidenceScores = [
        analystScore > 0 ? 1 : analystScore < 0 ? -1 : 0,
        newsSentiment.score > 0 ? 1 : newsSentiment.score < 0 ? -1 : 0,
        socialSentiment.score > 0 ? 1 : socialSentiment.score < 0 ? -1 : 0
    ];
    
    const allPositive = confidenceScores.every(score => score > 0);
    const allNegative = confidenceScores.every(score => score < 0);
    const allNeutral = confidenceScores.every(score => score === 0);
    const mixed = !allPositive && !allNegative && !allNeutral;
    
    let confidence;
    if (allPositive || allNegative) {
        confidence = "Alta";
    } else if (allNeutral) {
        confidence = "Media";
    } else if (mixed) {
        confidence = "Bassa";
    }
    
    return {
        score: normalizedScore,
        label,
        confidence
    };
}

/**
 * Calcola l'impatto della volatilità basato sul sentiment
 * @param {Object} compositeSentiment - Sentiment composito
 * @param {string} newsVolatility - Volatilità riportata dalle news
 * @returns {string} - Impatto della volatilità
 */
function calculateVolatilityImpact(compositeSentiment, newsVolatility) {
    const sentimentScore = compositeSentiment.score;
    
    // Converti volatilità testuale in un fattore numerico
    let volatilityFactor;
    switch (newsVolatility) {
        case "alta": volatilityFactor = 2; break;
        case "media": volatilityFactor = 1; break;
        case "bassa": volatilityFactor = 0.5; break;
        default: volatilityFactor = 1;
    }
    
    // Calcola l'impatto
    if (sentimentScore > 5 && volatilityFactor > 1) {
        return "Alto Positivo";
    } else if (sentimentScore < -5 && volatilityFactor > 1) {
        return "Alto Negativo";
    } else if (sentimentScore > 3) {
        return "Moderato Positivo";
    } else if (sentimentScore < -3) {
        return "Moderato Negativo";
    } else {
        return "Neutrale";
    }
}

/**
 * Calcola un segnale di momentum basato sul sentiment di news e social
 * @param {Object} newsSentiment - Sentiment delle news
 * @param {Object} socialSentiment - Sentiment dei social media
 * @returns {string} - Segnale di momentum
 */
function calculateMomentumSignal(newsSentiment, socialSentiment) {
    const newsScore = newsSentiment.score;
    const socialScore = socialSentiment.score;
    const trending = socialSentiment.trending;
    
    // Cerca un segnale di momentum emergente
    // Sentiment social più positivo delle news = possibile opportunità al rialzo
    if (socialScore > 5 && socialScore > newsScore + 3 && trending) {
        return "Forte Rialzo Emergente";
    }
    // Sentiment social più negativo delle news = possibile opportunità al ribasso
    else if (socialScore < -5 && socialScore < newsScore - 3 && trending) {
        return "Forte Ribasso Emergente";
    }
    // Sentiment positivo e allineato = momentum rialzista
    else if (socialScore > 3 && newsScore > 3) {
        return "Rialzo Sostenuto";
    }
    // Sentiment negativo e allineato = momentum ribassista
    else if (socialScore < -3 && newsScore < -3) {
        return "Ribasso Sostenuto";
    }
    // Sentiment contrastante = segnale neutrale/misto
    else if (Math.sign(socialScore) !== Math.sign(newsScore) && 
             Math.abs(socialScore) > 3 && Math.abs(newsScore) > 3) {
        return "Segnali Contrastanti";
    } else {
        return "Neutrale";
    }
}

/**
 * Calcola il livello di convinzione basato su analisti e insider
 * @param {Object} analystData - Dati degli analisti
 * @param {string} insiderTrend - Tendenza dell'insider trading
 * @returns {string} - Livello di convinzione
 */
function calculateConvictionLevel(analystData, insiderTrend) {
    // Converti i dati in punteggi per calcolo
    let analystScore;
    switch (analystData.consensus) {
        case "Fortemente Positivo": analystScore = 2; break;
        case "Positivo": analystScore = 1; break;
        case "Neutrale": analystScore = 0; break;
        case "Negativo": analystScore = -1; break;
        case "Fortemente Negativo": analystScore = -2; break;
        default: analystScore = 0;
    }
    
let insiderScore;
    switch (insiderTrend) {
        case "Fortemente Positivo": insiderScore = 2; break;
        case "Positivo": insiderScore = 1; break;
        case "Neutrale": insiderScore = 0; break;
        case "Negativo": insiderScore = -1; break;
        case "Fortemente Negativo": insiderScore = -2; break;
        default: insiderScore = 0;
    }
    
    // Calcola la convinzione
    const totalScore = analystScore + insiderScore;
    
    if (totalScore >= 3) {
        return "Molto Alta (Rialzo)";
    } else if (totalScore >= 1) {
        return "Alta (Rialzo)";
    } else if (totalScore <= -3) {
        return "Molto Alta (Ribasso)";
    } else if (totalScore <= -1) {
        return "Alta (Ribasso)";
    } else {
        return "Moderata";
    }
}

/**
 * Genera un report di sentiment in formato testuale
 * @param {Object} sentimentData - Dati completi di sentiment
 * @returns {string} - Report di sentiment formattato
 */
function generateSentimentReport(sentimentData) {
    if (!sentimentData) {
        return "Dati di sentiment non disponibili.";
    }
    
    // Formatta il sentiment composito
    const compositeSentiment = sentimentData.compositeSentiment;
    
    // Formatta il target price se disponibile
    let priceTargetText = "N/D";
    if (sentimentData.analystRatings.priceTarget) {
        const pt = sentimentData.analystRatings.priceTarget;
        priceTargetText = `$${pt.priceTarget} (Range: $${pt.targetLow} - $${pt.targetHigh})`;
    }
    
    // Aggiungi icone emoji in base al sentiment
    let sentimentEmoji = "🔄"; // Neutrale di default
    if (compositeSentiment.score > 5) sentimentEmoji = "🔥"; // Molto positivo
    else if (compositeSentiment.score > 0) sentimentEmoji = "👍"; // Positivo
    else if (compositeSentiment.score < -5) sentimentEmoji = "⚠️"; // Molto negativo
    else if (compositeSentiment.score < 0) sentimentEmoji = "👎"; // Negativo
    
    return `
📊 ANALISI SENTIMENT ${sentimentData.symbol} ${sentimentEmoji}

🔍 Sentiment Complessivo: ${compositeSentiment.label} (${compositeSentiment.score.toFixed(1)}/10)
   Livello di confidenza: ${compositeSentiment.confidence}

📈 Consensus Analisti: ${sentimentData.analystRatings.consensus}
   Target Price: ${priceTargetText}

📰 Sentiment News: ${sentimentData.newsSentiment.label}
   Volume coverage: ${sentimentData.newsSentiment.volume} articoli recenti
   ${sentimentData.newsSentiment.trending ? "🔥 Trending nelle news!" : ""}
   ${sentimentData.newsSentiment.primaryTrend ? `Trend: ${sentimentData.newsSentiment.primaryTrend}` : ""}

🌐 Sentiment Social: ${sentimentData.socialSentiment.label}
   Volume discussioni: ${sentimentData.socialSentiment.volume}/10
   ${sentimentData.socialSentiment.trending ? "🔥 Trending sui social!" : ""}
   ${sentimentData.socialSentiment.keywords && sentimentData.socialSentiment.keywords.length > 0 ? 
     `Keywords: ${sentimentData.socialSentiment.keywords.join(", ")}` : ""}

👔 Insider Trading: ${sentimentData.insiderTrend}

🔮 Indicatori Principali:
   • Impatto Volatilità: ${sentimentData.sentimentMetrics.volatilityImpact}
   • Segnale Momentum: ${sentimentData.sentimentMetrics.momentumSignal}
   • Livello Convinzione: ${sentimentData.sentimentMetrics.convictionLevel}
`;
}

/**
 * Applica l'analisi del sentiment alla raccomandazione tecnica
 * @param {string} baseRecommendation - Raccomandazione basata sull'analisi tecnica
 * @param {Object} sentimentData - Dati completi di sentiment
 * @returns {string} - Raccomandazione adattata al sentiment
 */
function adjustRecommendationWithSentiment(baseRecommendation, sentimentData) {
    if (!sentimentData || !baseRecommendation) {
        return baseRecommendation;
    }
    
    const sentimentScore = sentimentData.compositeSentiment.score;
    const sentimentConfidence = sentimentData.compositeSentiment.confidence;
    const conviction = sentimentData.sentimentMetrics.convictionLevel;
    const momentum = sentimentData.sentimentMetrics.momentumSignal;
    
    // Estrai la direzione della raccomandazione base
    const isLong = baseRecommendation.toLowerCase().includes('compra');
    const isShort = baseRecommendation.toLowerCase().includes('vendi');
    const isStrong = baseRecommendation.toLowerCase().includes('forte');
    const isNeutral = baseRecommendation.toLowerCase().includes('mantieni');
    
    // Non modificare la raccomandazione se il sentiment ha bassa confidenza
    if (sentimentConfidence === "Bassa") {
        return baseRecommendation;
    }
    
    // Casi in cui il sentiment rafforza la raccomandazione
    if (isLong && sentimentScore > 5 && sentimentConfidence === "Alta") {
        return isStrong ? baseRecommendation : baseRecommendation.replace('Compra', 'Compra Forte');
    }
    
    if (isShort && sentimentScore < -5 && sentimentConfidence === "Alta") {
        return isStrong ? baseRecommendation : baseRecommendation.replace('Vendi', 'Vendi Forte');
    }
    
    // Casi in cui il sentiment contraddice la raccomandazione
    if (isLong && sentimentScore < -3 && (conviction.includes("Alta (Ribasso)") || conviction.includes("Molto Alta (Ribasso)"))) {
        return isStrong ? baseRecommendation.replace('Compra Forte', 'Compra') : "Mantieni";
    }
    
    if (isShort && sentimentScore > 3 && (conviction.includes("Alta (Rialzo)") || conviction.includes("Molto Alta (Rialzo)"))) {
        return isStrong ? baseRecommendation.replace('Vendi Forte', 'Vendi') : "Mantieni";
    }
    
    // Casi in cui il momentum dai social può rafforzare/indebolire
    if (isLong && momentum === "Forte Rialzo Emergente") {
        return isStrong ? baseRecommendation : baseRecommendation.replace('Compra', 'Compra Forte');
    }
    
    if (isShort && momentum === "Forte Ribasso Emergente") {
        return isStrong ? baseRecommendation : baseRecommendation.replace('Vendi', 'Vendi Forte');
    }
    
    // Caso di segnali contrastanti
    if ((isLong || isShort) && momentum === "Segnali Contrastanti") {
        return isStrong ? 
            baseRecommendation.replace(isLong ? 'Compra Forte' : 'Vendi Forte', isLong ? 'Compra' : 'Vendi') : 
            baseRecommendation;
    }
    
    // Se non ci sono motivi per modificare, ritorna la raccomandazione originale
    return baseRecommendation;
}

/**
 * Arricchisce l'analisi tecnica con informazioni di sentiment
 * @param {string} technicalAnalysis - Testo dell'analisi tecnica
 * @param {Object} sentimentData - Dati di sentiment
 * @returns {string} - Analisi arricchita
 */
function enrichAnalysisWithSentiment(technicalAnalysis, sentimentData) {
    if (!sentimentData || !technicalAnalysis) {
        return technicalAnalysis;
    }
    
    // Genera un paragrafo di sentiment da aggiungere all'analisi
    const sentimentParagraph = `
ANALISI SENTIMENT: ${sentimentData.compositeSentiment.label} (Confidenza: ${sentimentData.compositeSentiment.confidence})
Il consensus degli analisti è ${sentimentData.analystRatings.consensus.toLowerCase()}${sentimentData.analystRatings.priceTarget ? ` con target price di $${sentimentData.analystRatings.priceTarget.priceTarget}` : ''}.
Il sentiment delle news è ${sentimentData.newsSentiment.label.toLowerCase()}${sentimentData.newsSentiment.trending ? ' con volume elevato' : ''}.
${sentimentData.insiderTrend !== "Neutrale" ? `Gli insider stanno mostrando attività ${sentimentData.insiderTrend.toLowerCase()}.` : ''}
Il segnale di momentum è ${sentimentData.sentimentMetrics.momentumSignal.toLowerCase()} con livello di convinzione ${sentimentData.sentimentMetrics.convictionLevel.toLowerCase()}.
`;
    
    // Trova la posizione ideale dove inserire il paragrafo di sentiment
    // Cerca il punto dopo l'analisi della situazione attuale
    let insertPosition = technicalAnalysis.indexOf("\n2.");
    
    if (insertPosition === -1) {
        // Fallback: cerca qualsiasi punto numerato
        insertPosition = technicalAnalysis.search(/\n\d+\./);
    }
    
    if (insertPosition === -1) {
        // Fallback: semplicemente aggiungi alla fine
        return technicalAnalysis + "\n\n" + sentimentParagraph;
    }
    
    // Inserisci il paragrafo nella posizione trovata
    return technicalAnalysis.slice(0, insertPosition) + 
           "\n\n" + sentimentParagraph + "\n" + 
           technicalAnalysis.slice(insertPosition);
}

// Esporta le funzioni
export {
    getSentimentAnalysis,
    generateSentimentReport,
    adjustRecommendationWithSentiment,
    enrichAnalysisWithSentiment
};