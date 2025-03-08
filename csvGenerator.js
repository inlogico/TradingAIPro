/**
 * Modulo per la generazione di report CSV dettagliati
 * Versione browser-only senza dipendenze da Node.js
 */

// Utilizziamo console come fallback per il Logger se non disponibile
const Logger = window.Logger || {
    debug: console.debug.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
};

/**
 * Genera un file CSV a partire da un array di oggetti
 * @param {Array<Object>} data - Array di oggetti da convertire in CSV
 * @param {Array<string>} headers - Intestazioni delle colonne (opzionale)
 * @returns {string} - Stringa contenente il CSV generato
 */
export function generateCSV(data, headers = null) {
    try {
        if (!Array.isArray(data) || data.length === 0) {
            Logger.warn('generateCSV: dati mancanti o vuoti');
            return '';
        }

        // Se non sono state specificate intestazioni, usa le chiavi del primo oggetto
        const csvHeaders = headers || Object.keys(data[0]);
        
        // Crea la riga di intestazione
        let csvContent = csvHeaders.join(',') + '\n';
        
        // Crea le righe di dati
        data.forEach(row => {
            const values = csvHeaders.map(header => {
                const value = row[header];
                
                // Gestisci tipi di dati particolari
                if (value === null || value === undefined) {
                    return ''; // Cella vuota per valori null/undefined
                } else if (typeof value === 'string') {
                    // Gestisci le virgolette nelle stringhe e le virgole
                    return `"${value.replace(/"/g, '""')}"`;
                } else if (typeof value === 'object') {
                    // Converti oggetti in JSON
                    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
                } else {
                    return value; // Numeri e booleani
                }
            });
            
            csvContent += values.join(',') + '\n';
        });
        
        Logger.debug(`CSV generato con successo: ${csvHeaders.length} colonne, ${data.length} righe`);
        
        return csvContent;
    } catch (error) {
        Logger.error('Errore nella generazione del CSV:', { error: error.message });
        throw error;
    }
}

/**
 * Salva il contenuto CSV con una struttura virtuale di archivio
 * @param {string} csvContent - Contenuto CSV da salvare
 * @param {Object} options - Opzioni per il salvataggio
 * @param {string} options.symbol - Simbolo dell'asset
 * @param {string} options.profileType - Tipo di profilo trader
 * @param {string} options.filename - Nome file opzionale
 * @returns {Promise<string|boolean>} - Path virtuale del file salvato
 */
export async function saveStructuredCSV(csvContent, options) {
    try {
        const { symbol, profileType, filename } = options;
        
        // Genera timestamp formattato
        const now = new Date();
        const timestamp = now.toISOString()
            .replace(/:/g, '-')      // Sostituisci : con - per compatibilità filesystem
            .replace(/\..+/, '');    // Rimuovi millisecondi
        
        // Costruisci il percorso virtuale
        const csvDir = `csv/${symbol.toUpperCase()}`;
        const actualFilename = filename || `${profileType}_${timestamp}.csv`;
        const virtualPath = `${csvDir}/${actualFilename}`;
        
        // Crea l'oggetto Blob per il download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        // Crea elemento link per il download
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', actualFilename);
        link.style.visibility = 'hidden';
        
        // Archivia informazioni sulla struttura virtuale
        try {
            // Salva l'informazione sulla struttura nel localStorage
            const csvArchive = JSON.parse(localStorage.getItem('csvArchive') || '{}');
            if (!csvArchive[symbol]) {
                csvArchive[symbol] = [];
            }
            
            // Aggiungi la nuova entry nella struttura virtuale
            csvArchive[symbol].push({
                filename: actualFilename,
                profile: profileType,
                timestamp: now.toISOString(),
                virtualPath: virtualPath,
                size: Math.round(csvContent.length / 1024 * 100) / 100 + ' KB'
            });
            
            // Limita la dimensione dell'archivio (mantieni solo ultimi 50 file)
            if (csvArchive[symbol].length > 50) {
                csvArchive[symbol] = csvArchive[symbol].slice(-50);
            }
            
            localStorage.setItem('csvArchive', JSON.stringify(csvArchive));
            
            // Aggiungi alla struttura globale per la visualizzazione
            if (!window.csvVirtualFileSystem) {
                window.csvVirtualFileSystem = {};
            }
            
            if (!window.csvVirtualFileSystem[symbol]) {
                window.csvVirtualFileSystem[symbol] = {};
            }
            
            window.csvVirtualFileSystem[symbol][actualFilename] = csvContent;
            
        } catch (e) {
            console.warn('Impossibile salvare i metadati di archiviazione:', e);
        }
        
        // Esegui il download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Pulisci la URL
        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 100);
        
        Logger.info(`CSV archiviato virtualmente in: ${virtualPath}`);
        return virtualPath;
    } catch (error) {
        Logger.error('Errore nel salvataggio del CSV:', { error: error.message });
        return false;
    }
}

/**
 * Genera un report CSV completo dell'analisi e lo salva nella struttura virtuale
 * @param {Object} analysisData - Dati completi dell'analisi
 * @param {string} filename - Nome del file (opzionale)
 * @returns {Promise<string|boolean>} - Percorso virtuale del file o false in caso di errore
 */
export async function generateAnalysisReport(analysisData, filename = null) {
    try {
        // Formatta i dati per il CSV
        const reportData = [{
            timestamp: new Date().toISOString(),
            symbol: analysisData.symbol,
            timeframe: analysisData.timeframe,
            currentPrice: analysisData.technicalIndicators.priceData.current,
            changePercent: analysisData.technicalIndicators.priceData.change,
            rsi: analysisData.technicalIndicators.momentum.rsi,
            macd: analysisData.technicalIndicators.momentum.macd,
            signal: analysisData.technicalIndicators.momentum.macdSignal,
            adx: analysisData.technicalIndicators.trend.adx,
            volatility: analysisData.technicalIndicators.volatility.value,
            volume: analysisData.technicalIndicators.volume.current,
            volumeChange: analysisData.technicalIndicators.volume.change,
            pivotPoint: analysisData.technicalIndicators.levels.pivotPoint,
            nearestSupport: Math.max(...analysisData.technicalIndicators.levels.supports.filter(s => s < analysisData.technicalIndicators.priceData.current) || [0]),
            nearestResistance: Math.min(...analysisData.technicalIndicators.levels.resistances.filter(r => r > analysisData.technicalIndicators.priceData.current) || [0]),
            sentiment: analysisData.sentimentData ? analysisData.sentimentData.compositeSentiment.score : 'N/D',
            recommendation: analysisData.recommendation || 'N/D',
            targetPrice: analysisData.targetPrice || 'N/D',
            stopLoss: analysisData.stopLoss || 'N/D',
            riskRewardRatio: analysisData.riskRewardRatio || 'N/D',
            confidence: analysisData.confidence || 'N/D',
            profile: analysisData.tradingProfile.name,
            notes: analysisData.notes || ''
        }];
        
        // Genera il CSV
        const csvContent = generateCSV(reportData);
        
        // Crea un nome file se non fornito
        const actualFilename = filename || `${analysisData.symbol}_${analysisData.timeframe}_${Date.now()}.csv`;
        
        // Salva il file nella struttura virtuale
        const savedPath = await saveStructuredCSV(csvContent, {
            symbol: analysisData.symbol,
            profileType: analysisData.tradingProfile.name.toLowerCase().replace(/\s+/g, '_'),
            filename: actualFilename
        });
        
        return savedPath;
    } catch (error) {
        Logger.error('Errore nella generazione del report CSV:', { error: error.message });
        return false;
    }
}

/**
 * Ottiene la lista dei CSV archiviati virtualmente
 * @param {string} symbol - Simbolo dell'asset (opzionale - se non specificato restituisce tutti)
 * @returns {Array} - Lista dei CSV archiviati
 */
export function getArchivedCSVs(symbol = null) {
    try {
        const csvArchive = JSON.parse(localStorage.getItem('csvArchive') || '{}');
        
        if (symbol) {
            return csvArchive[symbol.toUpperCase()] || [];
        } else {
            // Restituisce tutti i CSV archiviati
            const allArchives = [];
            for (const [sym, files] of Object.entries(csvArchive)) {
                files.forEach(file => {
                    allArchives.push({...file, symbol: sym});
                });
            }
            return allArchives;
        }
    } catch (e) {
        console.error('Errore nel recupero dell\'archivio CSV:', e);
        return [];
    }
}

/**
 * Visualizza l'archivio CSV in una finestra modale
 * @param {string} symbol - Simbolo dell'asset (opzionale)
 */
export function showCSVArchiveUI(symbol = null) {
    // Ottieni i dati archiviati
    const archives = getArchivedCSVs(symbol);
    
    if (archives.length === 0) {
        alert('Nessun file CSV archiviato trovato.');
        return;
    }
    
    // Crea un elemento modale nel DOM
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
    modal.style.zIndex = '1000';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    
    // Contenuto modale
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'white';
    modalContent.style.padding = '20px';
    modalContent.style.borderRadius = '8px';
    modalContent.style.width = '80%';
    modalContent.style.maxWidth = '800px';
    modalContent.style.maxHeight = '80%';
    modalContent.style.overflow = 'auto';
    
    // Titolo
    const title = document.createElement('h2');
    title.textContent = 'CSV Archiviati';
    title.style.marginTop = '0';
    modalContent.appendChild(title);
    
    // Pulsante chiusura
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Chiudi';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '10px';
    closeBtn.style.padding = '5px 10px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => document.body.removeChild(modal);
    modalContent.appendChild(closeBtn);
    
    // Tabella dei file
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    
    // Intestazione tabella
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Simbolo', 'Profilo', 'Data', 'Nome File', 'Dimensione', 'Azioni'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        th.style.textAlign = 'left';
        th.style.padding = '8px';
        th.style.borderBottom = '1px solid #ddd';
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Corpo tabella
    const tbody = document.createElement('tbody');
    archives.forEach(file => {
        const row = document.createElement('tr');
        
        // Simbolo
        const tdSymbol = document.createElement('td');
        tdSymbol.textContent = file.symbol;
        tdSymbol.style.padding = '8px';
        tdSymbol.style.borderBottom = '1px solid #ddd';
        row.appendChild(tdSymbol);
        
        // Profilo
        const tdProfile = document.createElement('td');
        tdProfile.textContent = file.profile;
        tdProfile.style.padding = '8px';
        tdProfile.style.borderBottom = '1px solid #ddd';
        row.appendChild(tdProfile);
        
        // Data
        const tdDate = document.createElement('td');
        const date = new Date(file.timestamp);
        tdDate.textContent = date.toLocaleString();
        tdDate.style.padding = '8px';
        tdDate.style.borderBottom = '1px solid #ddd';
        row.appendChild(tdDate);
        
        // Nome File
        const tdFilename = document.createElement('td');
        tdFilename.textContent = file.filename;
        tdFilename.style.padding = '8px';
        tdFilename.style.borderBottom = '1px solid #ddd';
        row.appendChild(tdFilename);
        
        // Dimensione
        const tdSize = document.createElement('td');
        tdSize.textContent = file.size || 'N/D';
        tdSize.style.padding = '8px';
        tdSize.style.borderBottom = '1px solid #ddd';
        row.appendChild(tdSize);
        
        // Azioni
        const tdActions = document.createElement('td');
        tdActions.style.padding = '8px';
        tdActions.style.borderBottom = '1px solid #ddd';
        
        // Pulsante di download
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Scarica';
        downloadBtn.style.marginRight = '5px';
        downloadBtn.style.padding = '5px 10px';
        downloadBtn.style.cursor = 'pointer';
        downloadBtn.onclick = () => {
            // Recupera il contenuto dal fileSystem virtuale se disponibile
            if (window.csvVirtualFileSystem && 
                window.csvVirtualFileSystem[file.symbol] && 
                window.csvVirtualFileSystem[file.symbol][file.filename]) {
                
                const content = window.csvVirtualFileSystem[file.symbol][file.filename];
                const blob = new Blob([content], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                alert('File non disponibile nella sessione corrente.');
            }
        };
        tdActions.appendChild(downloadBtn);
        
        row.appendChild(tdActions);
        
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    modalContent.appendChild(table);
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}
