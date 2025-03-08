/**
 * Punto di ingresso principale dell'applicazione TradingAI Pro
 * Inizializza tutti i componenti e gestisce gli eventi globali
 */

import { 
    updateProfileInfo, 
    fetchAllData, 
    runAIAnalysis, 
    fetchSentimentAnalysis, 
    copyOrderToClipboard,
    clearCache
} from './main.js';
import { initializeAutocomplete } from './autocomplete.js';
import Logger from './advanced-logger.js';

/**
 * Inizializza l'applicazione
 */
function initializeApp() {
    try {
        Logger.info("Inizializzazione TradingAI Pro...");
        
        // Inizializza l'autocompletamento
        initializeAutocomplete();
        
        // Esponi le funzioni globalmente in modo sicuro
        window.fetchAllData = fetchAllData;
        window.runAIAnalysis = runAIAnalysis;
        window.fetchSentimentAnalysis = fetchSentimentAnalysis;
        window.copyOrderToClipboard = copyOrderToClipboard;
        window.clearCache = clearCache;
        
        // Aggiungi event listeners globali
        setupEventListeners();
        
        Logger.info("TradingAI Pro inizializzato con successo");
    } catch (error) {
        Logger.error("Errore durante l'inizializzazione dell'app:", { error: error.message });
        console.error("Errore durante l'inizializzazione:", error);
    }
}

/**
 * Configura tutti gli event listeners dell'applicazione
 */
function setupEventListeners() {
    // Ascolta l'evento dashboard-ready
    document.addEventListener('dashboard-ready', function(event) {
        try {
            Logger.info('Dashboard pronta, inizializzazione componenti...');
            
            // Attendi un attimo per essere sicuri che tutti gli elementi siano caricati
            setTimeout(() => {
                // Aggiorna le informazioni del profilo in modo sicuro
                const profileValue = event.detail.profileValue;
                if (profileValue) {
                    try {
                        const profileInfo = document.getElementById('profileInfo');
                        if (profileInfo) {
                            updateProfileInfo(profileValue);
                        } else {
                            Logger.warn('Elemento profileInfo non trovato');
                        }
                    } catch (e) {
                        Logger.error('Errore nell\'aggiornamento del profilo:', { error: e.message });
                    }
                }
                
                // Aggiungi event listener ai pulsanti della dashboard
                const fetchDataBtn = document.getElementById('fetchDataBtn');
                if (fetchDataBtn) {
                    fetchDataBtn.addEventListener('click', () => fetchAllData(false));
                    
                    // Aggiungi supporto per il refreshDataBtn se esiste
                    const refreshDataBtn = document.getElementById('refreshDataBtn');
                    if (refreshDataBtn) {
                        refreshDataBtn.addEventListener('click', () => fetchAllData(true));
                    }
                }
                
                const runAnalysisBtn = document.getElementById('runAnalysisBtn');
                if (runAnalysisBtn) {
                    runAnalysisBtn.addEventListener('click', runAIAnalysis);
                }
                
                const downloadCsvBtn = document.getElementById('downloadCsvBtn');
                if (downloadCsvBtn) {
                    downloadCsvBtn.addEventListener('click', window.downloadCSV);
                }
                
                const clearCacheBtn = document.getElementById('clearCacheBtn');
                if (clearCacheBtn) {
                    clearCacheBtn.addEventListener('click', clearCache);
                }
                
                // Aggiorna il box informativo quando cambia il profilo
                const tradingProfile = document.getElementById('tradingProfile');
                if (tradingProfile) {
                    tradingProfile.addEventListener('change', function() {
                        try {
                            updateProfileInfo(this.value);
                        } catch (e) {
                            Logger.error('Errore nel cambio profilo:', { error: e.message });
                        }
                    });
                }
                
                // Gestione evento di copy per ordine MT4
                document.addEventListener('click', function(e) {
                    if (e.target && e.target.id === 'copyOrderBtn') {
                        if (typeof window.copyOrderToClipboard === 'function') {
                            window.copyOrderToClipboard();
                        }
                    }
                });
                
                Logger.info('Event listeners configurati con successo');
            }, 100);
        } catch (error) {
            Logger.error('Errore durante l\'inizializzazione della dashboard:', { error: error.message });
        }
    });
    
    // Ascolta eventi di selezione del profilo
    document.addEventListener('DOMContentLoaded', function() {
        document.querySelectorAll('.profile-card').forEach(card => {
            card.addEventListener('click', function() {
                const profileValue = this.getAttribute('data-profile');
                if (window.selectProfile && typeof window.selectProfile === 'function') {
                    window.selectProfile(profileValue);
                }
            });
        });
        
        Logger.info('Event listeners per selezione profilo configurati');
    });
    
    // Gestione errori globale
    window.addEventListener('error', function(event) {
        Logger.error('Errore JavaScript non gestito:', {
            message: event.message,
            source: event.filename,
            line: event.lineno,
            column: event.colno
        });
    });
    
    // Gestione errori di rete
    window.addEventListener('unhandledrejection', function(event) {
        Logger.error('Promise non gestita:', {
            reason: event.reason ? event.reason.message : 'Unknown'
        });
    });
}

// Avvia l'applicazione all'avvio del documento
document.addEventListener('DOMContentLoaded', initializeApp);
