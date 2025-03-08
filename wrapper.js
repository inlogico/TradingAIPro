/**
 * Wrapper semplificato per assicurare la compatibilità
 */

// Variabili globali per il CSV
window.csvData = null;
window.selectedSymbol = '';
window.selectedTimeframe = '';
window.selectedProfile = '';

// Funzione di download CSV
window.downloadCSV = function() {
    if (!window.csvData || !window.selectedSymbol) {
        console.warn('Nessun dato CSV disponibile per il download');
        return;
    }
    
    try {
        const fileName = `${window.selectedSymbol}_${window.selectedTimeframe}_${window.selectedProfile}_technical.csv`;
        
        // Crea un elemento link per il download
        const blob = new Blob([window.csvData], { type: 'text/csv' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`CSV scaricato: ${fileName}`);
    } catch (error) {
        console.error('Errore durante il download del CSV:', error);
    }
};

// Funzione wrapper per fetchAllData
window.fetchData = async function() {
    try {
        // Disabilita il pulsante CSV durante il caricamento
        const downloadBtn = document.getElementById('downloadCsvBtn');
        if (downloadBtn) {
            downloadBtn.disabled = true;
        }
        
        // Recupera i dati inseriti
        const symbolInput = document.getElementById('symbol');
        const profileSelect = document.getElementById('tradingProfile');
        
        if (symbolInput && profileSelect) {
            window.selectedSymbol = symbolInput.value.toUpperCase();
            window.selectedProfile = profileSelect.value;
            
            // Determina il timeframe dal profilo selezionato
            switch(window.selectedProfile) {
                case 'scalping':
                    window.selectedTimeframe = '15min';
                    break;
                case 'swing':
                    window.selectedTimeframe = '1hour';
                    break;
                case 'position':
                    window.selectedTimeframe = 'daily';
                    break;
                case 'longterm':
                    window.selectedTimeframe = 'weekly';
                    break;
                default:
                    window.selectedTimeframe = 'daily';
            }
        }
        
        // Chiama la funzione originale
        if (typeof window.fetchAllData === 'function') {
            await window.fetchAllData();
        } else {
            console.error('Funzione fetchAllData non trovata');
        }
        
        // Abilita il pulsante CSV dopo il caricamento
        if (downloadBtn) {
            setTimeout(() => {
                downloadBtn.disabled = false;
            }, 2000);
        }
    } catch (error) {
        console.error("Errore durante l'analisi:", error);
        
        // Assicurati che il pulsante venga riabilitato anche in caso di errore
        const downloadBtn = document.getElementById('downloadCsvBtn');
        if (downloadBtn) {
            downloadBtn.disabled = true;
        }
    }
};

// Intercetta i link per catturare il download CSV
document.addEventListener('DOMContentLoaded', function() {
    try {
        const originalCreateElement = document.createElement;
        document.createElement = function(tag) {
            const element = originalCreateElement.call(document, tag);
            
            // Intercetta i link di download (generati da fetchAllData)
            if (tag.toLowerCase() === 'a' && element) {
                const originalHrefDescriptor = Object.getOwnPropertyDescriptor(HTMLAnchorElement.prototype, 'href');
                
                if (originalHrefDescriptor && originalHrefDescriptor.set) {
                    Object.defineProperty(element, 'href', {
                        set: function(value) {
                            // Chiamata originale
                            originalHrefDescriptor.set.call(this, value);
                            
                            // Controlla se è un URL blob (CSV file)
                            if (value.startsWith('blob:')) {
                                // Estrai i dati dal blob URL
                                fetch(value)
                                    .then(response => response.text())
                                    .then(text => {
                                        // Memorizza i dati CSV per il download manuale
                                        window.csvData = text;
                                        
                                        // Previeni il download automatico
                                        const originalClick = element.click;
                                        element.click = function() {
                                            // Non fare nulla, il download avverrà tramite il pulsante dedicato
                                            console.log('Download automatico prevenuto, usa il pulsante "Scarica CSV"');
                                            
                                            // Abilita il pulsante di download
                                            const downloadBtn = document.getElementById('downloadCsvBtn');
                                            if (downloadBtn) {
                                                downloadBtn.disabled = false;
                                            }
                                        };
                                    })
                                    .catch(err => console.error('Errore nel recupero dei dati CSV:', err));
                            }
                        },
                        get: function() {
                            return originalHrefDescriptor.get.call(this);
                        }
                    });
                }
            }
            
            return element;
        };
    } catch (error) {
        console.error('Errore durante la configurazione dell\'intercettore di download:', error);
    }
});

console.log('Wrapper.js versione aggiornata caricato con successo');
