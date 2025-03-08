/**
 * Modulo per la gestione dell'interfaccia utente
 */

import { CONFIG } from './config.js';

/**
 * Visualizza il riepilogo tecnico degli indicatori con una UI moderna
 * @param {Object} data - Oggetto con tutti i dati tecnici
 */
function displayTechnicalOverview(data) {
    const technicalOverview = document.getElementById("technicalOverview");
    
    if (!technicalOverview || !data) {
        console.error("Elemento technicalOverview non trovato o dati mancanti");
        return;
    }
    
    const { symbol, companyInfo, timeframe, technicalIndicators, tradingProfile } = data;
    
    // Determina la classe CSS in base al profilo
    const profileClass = `profile-${tradingProfile.name.toLowerCase().replace(/\s+/g, '')}`;
    
    // Converti il timeframe in formato leggibile
    const readableTimeframe = CONFIG.timeframes[timeframe] || timeframe;
    
    // Determina se il prezzo è in aumento o in calo
    const priceClass = technicalIndicators.priceData.change >= 0 ? "price-up" : "price-down";
    const trendArrow = technicalIndicators.priceData.change >= 0 ? "▲" : "▼";
    
    // Crea l'header dell'asset
    let html = `
        <div class="asset-header">
            <div class="asset-logo-container">
                ${companyInfo.image ? 
                    `<img src="${companyInfo.image}" class="asset-logo" alt="${symbol} logo">` : 
                    `<div class="asset-logo">${symbol.charAt(0)}</div>`}
            </div>
            
            <div class="asset-info">
                <div class="asset-name-container">
                    <h2 class="asset-symbol">${symbol}</h2>
                    <span class="asset-name">${companyInfo.name}</span>
                </div>
                
                <div class="asset-price-container">
                    <span class="asset-price">$${safeFormat(technicalIndicators.priceData.current)}</span>
                    <span class="asset-change ${priceClass}">
                        <span class="trend-arrow">${trendArrow}</span>
                        ${safeFormat(technicalIndicators.priceData.change)}%
                    </span>
                </div>
            </div>
            
            <div class="asset-timeframe">
                <span class="timeframe-badge">${readableTimeframe}</span>
                <span class="profile-badge">${tradingProfile.icon} ${tradingProfile.name}</span>
            </div>
        </div>
        
        <div class="indicators-container">
            <h3 class="section-title">Indicatori Tecnici</h3>
            
            <div class="indicator-grid">
                <!-- RSI -->
                <div class="indicator-card">
                    <div class="indicator-name">RSI (${technicalIndicators.momentum.rsiPeriod})</div>
                    <div class="indicator-value">
                        ${safeFormat(technicalIndicators.momentum.rsi)}
                        ${getRSITrend(technicalIndicators.momentum.rsi)}
                    </div>
                </div>
                
                <!-- MACD -->
                <div class="indicator-card">
                    <div class="indicator-name">MACD</div>
                    <div class="indicator-value">
                        ${safeFormat(technicalIndicators.momentum.macd, 4)}
                        (Signal: ${safeFormat(technicalIndicators.momentum.macdSignal, 4)})
                    </div>
                </div>
                
                <!-- ADX -->
                <div class="indicator-card">
                    <div class="indicator-name">ADX (${technicalIndicators.trend.adxPeriod})</div>
                    <div class="indicator-value">
                        ${safeFormat(technicalIndicators.trend.adx)}
                        ${getADXTrend(technicalIndicators.trend.adx)}
                    </div>
                </div>
                
                <!-- Volatilità -->
                <div class="indicator-card">
                    <div class="indicator-name">Volatilità</div>
                    <div class="indicator-value">
                        ${safeFormat(technicalIndicators.volatility.value)}%
                        ${getVolatilityTrend(technicalIndicators.volatility.value)}
                    </div>
                </div>
                
                <!-- SMA -->
                <div class="indicator-card">
                    <div class="indicator-name">SMA (${technicalIndicators.movingAverages.periods.short})</div>
                    <div class="indicator-value">
                        $${safeFormat(technicalIndicators.movingAverages.smaShort)}
                        ${getSMATrend(technicalIndicators.priceData.current, technicalIndicators.movingAverages.smaShort)}
                    </div>
                </div>
                
                <!-- SMA Medium -->
                <div class="indicator-card">
                    <div class="indicator-name">SMA (${technicalIndicators.movingAverages.periods.medium})</div>
                    <div class="indicator-value">
                        $${safeFormat(technicalIndicators.movingAverages.smaMedium)}
                        ${getSMATrend(technicalIndicators.priceData.current, technicalIndicators.movingAverages.smaMedium)}
                    </div>
                </div>
                
                <!-- Volume -->
                <div class="indicator-card">
                    <div class="indicator-name">Volume</div>
                    <div class="indicator-value">
                        ${formatVolume(technicalIndicators.volume.current)}
                        (${technicalIndicators.volume.change > 0 ? '+' : ''}${safeFormat(technicalIndicators.volume.change)}%)
                    </div>
                </div>
                
                <!-- Bollinger Width -->
                <div class="indicator-card">
                    <div class="indicator-name">Bollinger Width</div>
                    <div class="indicator-value">
                        ${safeFormat(technicalIndicators.volatility.bollingerWidth)}%
                    </div>
                </div>
            </div>
            
            <!-- Livelli di supporto e resistenza -->
            <h3 class="section-title">Livelli Chiave</h3>
            
            <div class="levels-container">
                <div class="levels-resistances">
                    <div class="level-title">Resistenze</div>
                    ${technicalIndicators.levels.resistances.slice(0, 3).map(level => 
                        `<div class="level-value resistance">$${safeFormat(level)}</div>`
                    ).join('')}
                </div>
                
                <div class="levels-pivot">
                    <div class="level-title">Pivot Point</div>
                    <div class="level-value pivot">$${safeFormat(technicalIndicators.levels.pivotPoint)}</div>
                </div>
                
                <div class="levels-supports">
                    <div class="level-title">Supporti</div>
                    ${technicalIndicators.levels.supports.slice(0, 3).map(level => 
                        `<div class="level-value support">$${safeFormat(level)}</div>`
                    ).join('')}
                </div>
            </div>
            
            <!-- Pattern tecnici -->
            <h3 class="section-title">Pattern Tecnici</h3>
            
            <div class="patterns-container">
                ${technicalIndicators.trend.patterns.map(pattern => `
                    <div class="pattern-card">
                        <div class="pattern-name">${pattern.pattern}</div>
                        <div class="pattern-info">
                            ${pattern.direction ? `Direzione: <span class="trend-${pattern.direction === 'rialzista' ? 'up' : 'down'}">${pattern.direction}</span>` : ''}
                            ${pattern.strength ? `<span class="pattern-strength">Forza: ${pattern.strength}</span>` : ''}
                        </div>
                        ${pattern.price ? `<span class="pattern-price">Prezzo: $${safeFormat(pattern.price)}</span>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    // Funzioni helper per determinare i trend
    function getRSITrend(rsi) {
        if (!rsi) return '';
        if (rsi > 70) return '<span class="trend-down">Ipercomprato</span>';
        if (rsi < 30) return '<span class="trend-up">Ipervenduto</span>';
        return '<span class="trend-neutral">Neutrale</span>';
    }
    
    function getADXTrend(adx) {
        if (!adx) return '';
        if (adx > 30) return '<span class="trend-up">Forte</span>';
        if (adx > 20) return '<span class="trend-neutral">Moderato</span>';
        return '<span class="trend-down">Debole</span>';
    }
    
    function getVolatilityTrend(volatility) {
        if (!volatility) return '';
        if (volatility > 30) return '<span class="trend-down">Alta</span>';
        if (volatility > 15) return '<span class="trend-neutral">Media</span>';
        return '<span class="trend-up">Bassa</span>';
    }
    
    function getSMATrend(price, sma) {
        if (!price || !sma) return '';
        if (price > sma) return '<span class="trend-up">Sopra</span>';
        return '<span class="trend-down">Sotto</span>';
    }
    
    function formatVolume(volume) {
        if (!volume) return 'N/D';
        if (volume >= 1000000000) return (volume / 1000000000).toFixed(2) + 'B';
        if (volume >= 1000000) return (volume / 1000000).toFixed(2) + 'M';
        if (volume >= 1000) return (volume / 1000).toFixed(2) + 'K';
        return volume.toFixed(0);
    }
    
    // Aggiorna il DOM e mostra il contenitore
    technicalOverview.innerHTML = html;
    technicalOverview.style.display = "block";
}

/**
 * Mostra un messaggio di errore
 * @param {string} elementId - ID dell'elemento in cui mostrare l'errore
 * @param {string} message - Messaggio di errore
 */
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="error-message"><span class="error-icon">❌</span> ${message}</div>`;
    }
}

/**
 * Mostra un messaggio di caricamento
 * @param {string} elementId - ID dell'elemento in cui mostrare il messaggio
 * @param {string} message - Messaggio da mostrare
 */
function showLoading(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `<div class="loading-container"><div class="loading-spinner"></div> <span>${message}</span></div>`;
        element.style.display = "block";
    }
}

/**
 * Formatta il testo dell'analisi AI aggiungendo lo stile alla raccomandazione
 * @param {string} analysisText - Testo dell'analisi
 * @returns {string} - Testo formattato con HTML
 */
function formatAnalysisText(analysisText) {
    // Estrai la raccomandazione per evidenziarla
    let formattedAnalysis = analysisText;
    const recommendationMatch = analysisText.match(/RACCOMANDAZIONE:\s*(Compra|Vendi|Mantieni)[^\n]*/i);
    
    if (recommendationMatch) {
        const recommendation = recommendationMatch[0];
        const recClass = recommendation.toLowerCase().includes('compra') ? 'recommendation-buy' : 
                        recommendation.toLowerCase().includes('vendi') ? 'recommendation-sell' : 
                        'recommendation-hold';
        
        formattedAnalysis = formattedAnalysis.replace(recommendation, 
            `<div class="recommendation ${recClass}">
                <div class="recommendation-badge"></div>
                <div class="recommendation-text">${recommendation}</div>
            </div>`
        );
    }
    
    // Migliora la formattazione delle sezioni
    formattedAnalysis = formattedAnalysis.replace(/^(\d+\.\s.*?)$/gm, '<h4 class="analysis-section">$1</h4>');
    
    // Evidenzia l'analisi del sentiment
    formattedAnalysis = formattedAnalysis.replace(/ANALISI SENTIMENT:(.*?)(?=\n\n|\n\d+\.|$)/s, match => {
        return `<div class="sentiment-highlight">${match}</div>`;
    });
    
    // Sostituisci i newline con tag <br>
    formattedAnalysis = formattedAnalysis.replace(/\n/g, '<br>');
    
    return formattedAnalysis;
}

/**
 * Visualizza il riepilogo dell'ordine MT4 generato
 * @param {string} orderSummary - Testo del riepilogo dell'ordine
 * @param {string} moneyManagementReport - Report di money management
 */
function displayOrderSummary(orderSummary, moneyManagementReport) {
    const orderSummaryOutput = document.getElementById("orderSummaryOutput");
    
    if (!orderSummaryOutput) {
        console.error("Elemento orderSummaryOutput non trovato!");
        return;
    }
    
    // Formatta l'output
    let formattedOutput = `
        <div class="order-summary-container">
            <div class="order-header">
                <h3>📊 Ordine MT4 Generato</h3>
                <button id="copyOrderBtn" class="btn-secondary">
                    <span class="btn-icon">📋</span>
                    Copia Comando
                </button>
            </div>
            <div class="order-details">
                ${orderSummary.replace(/\n/g, '<br>')}
            </div>
        </div>
        
        <div class="money-management-container">
            <h3>💰 Money Management</h3>
            <div class="money-management-details">
                ${moneyManagementReport.replace(/\n/g, '<br>')}
            </div>
        </div>
    `;
    
    orderSummaryOutput.innerHTML = formattedOutput;
    
    // Aggiungi il gestore eventi per il pulsante di copia
    const copyButton = document.getElementById("copyOrderBtn");
    if (copyButton) {
        copyButton.addEventListener("click", function() {
            // Chiama la funzione di copia dal modulo main
            if (typeof window.copyOrderToClipboard === 'function') {
                window.copyOrderToClipboard();
            }
        });
    }
}

/**
 * Visualizza l'analisi del sentiment
 * @param {Object|string} sentimentData - Dati o report del sentiment
 */
function displaySentimentAnalysis(sentimentData) {
    const sentimentOutput = document.getElementById("sentimentOutput");
    
    if (!sentimentOutput) {
        console.error("Elemento sentimentOutput non trovato!");
        return;
    }
    
    // Converti oggetto in report se necessario
    let formattedReport;
    if (typeof sentimentData === 'string') {
        formattedReport = sentimentData.replace(/\n/g, '<br>');
    } else if (typeof sentimentData === 'object') {
        // Qui dovremmo formattare l'oggetto in un report HTML
        // Questa è una semplificazione
        formattedReport = `
            <h3>📊 Analisi del Sentiment</h3>
            <p>Sentiment complessivo: ${sentimentData.compositeSentiment?.label || 'N/D'}</p>
            <p>Confidenza: ${sentimentData.compositeSentiment?.confidence || 'N/D'}</p>
            <p>Consensus analisti: ${sentimentData.analystRatings?.consensus || 'N/D'}</p>
        `;
    } else {
        formattedReport = "Dati di sentiment non disponibili";
    }
    
    sentimentOutput.innerHTML = formattedReport;
}

/**
 * Funzione helper per formattare in modo sicuro i valori numerici
 * @param {number|null} value - Valore da formattare
 * @param {number} decimals - Numero di decimali
 * @returns {string} - Valore formattato o "N/D"
 */
function safeFormat(value, decimals = 2) {
    return (value !== null && value !== undefined && !isNaN(value)) ? 
        Number(value).toFixed(decimals) : "N/D";
}

// Esporta le funzioni
export {
    displayTechnicalOverview,
    showError,
    showLoading,
    formatAnalysisText,
    safeFormat,
    displayOrderSummary,
    displaySentimentAnalysis
};
