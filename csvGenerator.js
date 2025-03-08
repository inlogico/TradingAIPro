/**
 * Modulo per la generazione di report CSV dettagliati
 * Permette di esportare risultati di analisi per archiviazione e revisione
 */

import Logger from './advanced-logger.js';

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
 * Salva il contenuto CSV in un file (solo per ambiente server)
 * @param {string} csvContent - Contenuto CSV da salvare
 * @param {string} filename - Nome del file
 * @returns {Promise<boolean>} - true se il salvataggio è avvenuto con successo
 */
export async function saveCSVToFile(csvContent, filename) {
    try {
        // Verifica se l'ambiente supporta fs (Node.js)
        if (typeof window === 'undefined') {
            const fs = await import('fs');
            await fs.promises.writeFile(filename, csvContent, 'utf8');
            Logger.info(`CSV salvato in ${filename}`);
            return true;
        } else {
            // In ambiente browser, offri il download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            Logger.info(`CSV preparato per il download: ${filename}`);
            return true;
        }
    } catch (error) {
        Logger.error('Errore nel salvataggio del CSV:', { filename, error: error.message });
        return false;
    }
}

/**
 * Genera un report CSV completo dell'analisi
 * @param {Object} analysisData - Dati completi dell'analisi
 * @param {string} filename - Nome del file (opzionale)
 * @returns {Promise<string|boolean>} - Percorso del file o false in caso di errore
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
            nearestSupport: Math.max(...analysisData.technicalIndicators.levels.supports.filter(s => s < analysisData.technicalIndicators.priceData.current)),
            nearestResistance: Math.min(...analysisData.technicalIndicators.levels.resistances.filter(r => r > analysisData.technicalIndicators.priceData.current)),
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
        
        // Se un nome file è specificato, salva il file
        if (filename) {
            const actualFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
            await saveCSVToFile(csvContent, actualFilename);
            return actualFilename;
        }
        
        // Altrimenti restituisci il contenuto CSV
        return csvContent;
    } catch (error) {
        Logger.error('Errore nella generazione del report CSV:', { error: error.message });
        return false;
    }
}