/**
 * Modulo per la gestione dell'interfaccia utente
 */

import { CONFIG } from './config.js';

/**
 * Visualizza il riepilogo tecnico degli indicatori con una UI moderna
 * @param {Object} data - Oggetto con tutti i dati tecnici
 */
function displayTechnicalOverview(data) {
    // ... [Codice esistente, mantienilo invariato] ...
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
                    <span class="btn-icon">📋</span>s
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
            window.copyOrderToClipboard();
        });
    }
}

/**
 * Visualizza l'analisi del sentiment
 * @param {string} sentimentReport - Report del sentiment
 */
function displaySentimentAnalysis(sentimentReport) {
    const sentimentOutput = document.getElementById("sentimentOutput");
    
    if (!sentimentOutput) {
        console.error("Elemento sentimentOutput non trovato!");
        return;
    }
    
    // Formatta l'output con stili
    const formattedReport = sentimentReport.replace(/\n/g, '<br>');
    
    sentimentOutput.innerHTML = `
        <div class="sentiment-container">
            ${formattedReport}
        </div>
    `;
}

/**
 * Funzione helper per formattare in modo sicuro i valori numerici
 * @param {number|null} value - Valore da formattare
 * @param {number} decimals - Numero di decimali
 * @returns {string} - Valore formattato o "N/D"
 */
function safeFormat(value, decimals = 2) {
    return (value !== null && value !== undefined) ? value.toFixed(decimals) : "N/D";
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