/**
 * Modulo per il money management e il dimensionamento delle posizioni
 * Implementa strategie di gestione del rischio adattate ai diversi profili di trading
 */

import { CONFIG } from './config.js';

// Configurazioni predefinite di money management per i diversi profili
const moneyManagementDefaults = {
    scalping: {
        maxRiskPerTrade: 0.01,  // 1% del capitale per trade
        maxDailyRisk: 0.03,     // 3% massimo rischio giornaliero
        maxDrawdown: 0.05,      // 5% drawdown massimo
        volatilityMultiplier: 0.8, // Riduce la size in alta volatilità
        scaleInLevels: 2,       // Numero di livelli per scale-in
        scaleOutLevels: 3,      // Numero di livelli per scale-out
        positionSizeAdjustment: 1.2, // Tendenza a posizioni maggiori ma brevi
        recommendedLeverage: 10  // Leva suggerita per scalping
    },
    swing: {
        maxRiskPerTrade: 0.015,  // 1.5% del capitale per trade
        maxDailyRisk: 0.04,      // 4% massimo rischio giornaliero
        maxDrawdown: 0.08,       // 8% drawdown massimo
        volatilityMultiplier: 1.0, // Size standard per volatilità media
        scaleInLevels: 3,        // Numero di livelli per scale-in
        scaleOutLevels: 3,       // Numero di livelli per scale-out
        positionSizeAdjustment: 1.0, // Size equilibrata
        recommendedLeverage: 5   // Leva suggerita per swing trading
    },
    position: {
        maxRiskPerTrade: 0.02,   // 2% del capitale per trade
        maxDailyRisk: 0.05,      // 5% massimo rischio giornaliero
        maxDrawdown: 0.12,       // 12% drawdown massimo
        volatilityMultiplier: 1.2, // Size maggiore per bassa volatilità
        scaleInLevels: 4,        // Numero di livelli per scale-in
        scaleOutLevels: 2,       // Numero di livelli per scale-out
        positionSizeAdjustment: 0.9, // Size leggermente ridotta per durate maggiori
        recommendedLeverage: 3   // Leva suggerita per position trading
    },
    longterm: {
        maxRiskPerTrade: 0.025,  // 2.5% del capitale per trade
        maxDailyRisk: 0.05,      // 5% massimo rischio giornaliero
        maxDrawdown: 0.15,       // 15% drawdown massimo
        volatilityMultiplier: 1.5, // Size maggiore per investimento a lungo termine
        scaleInLevels: 5,        // Numero di livelli per scale-in
        scaleOutLevels: 2,       // Numero di livelli per scale-out
        positionSizeAdjustment: 0.8, // Size ridotta per durate molto lunghe
        recommendedLeverage: 1   // Senza leva o leva minima per investimenti
    }
};

// Configurazioni personalizzate dell'utente (inizialmente copiate dai default)
let userSettings = JSON.parse(JSON.stringify(moneyManagementDefaults));

/**
 * Restituisce le configurazioni di money management per un profilo specifico
 * @param {Object} accountInfo - Informazioni sul conto di trading
 * @param {string} profileName - Nome del profilo di trading
 * @returns {Object} - Configurazioni di money management
 */
function getMoneyManagementSettings(accountInfo, profileName) {
    const profile = profileName.toLowerCase().replace(/\s+/g, '');
    let settings;
    
    // Determina il profilo corretto
    if (profile.includes('scalp') || profile.includes('falco')) {
        settings = userSettings.scalping;
    } else if (profile.includes('swing') || profile.includes('serpente')) {
        settings = userSettings.swing;
    } else if (profile.includes('position') || profile.includes('orso')) {
        settings = userSettings.position;
    } else if (profile.includes('longterm') || profile.includes('tartaruga')) {
        settings = userSettings.longterm;
    } else {
        // Impostazioni predefinite se il profilo non è riconosciuto
        settings = userSettings.swing; 
    }
    
    // Aggiusta le impostazioni in base al saldo del conto
    // Investitori con saldi minori dovrebbero rischiare meno per trade
    if (accountInfo && accountInfo.balance) {
        if (accountInfo.balance < 1000) {
            // Per conti piccoli, riduce il rischio per trade
            settings = {...settings, maxRiskPerTrade: Math.max(0.005, settings.maxRiskPerTrade * 0.7)};
        } else if (accountInfo.balance > 50000) {
            // Per conti grandi, riduce il rischio per trade ma aumenta la size
            settings = {...settings, maxRiskPerTrade: Math.min(0.01, settings.maxRiskPerTrade * 0.8)};
        }
    }
    
    return settings;
}

/**
 * Calcola la dimensione ottimale della posizione in base al capitale e al rischio
 * @param {number} accountBalance - Saldo del conto di trading
 * @param {number} riskPercent - Percentuale di rischio nella singola operazione
 * @param {number} maxRiskPerTrade - Massimo rischio percentuale tollerato per operazione
 * @param {number} volatility - Volatilità dell'asset (in percentuale)
 * @returns {number} - Dimensione della posizione (in unità/lotti)
 */
function calculatePositionSize(accountBalance, riskPercent, maxRiskPerTrade, volatility = 15) {
    // Verifica i parametri e imposta valori predefiniti se necessario
    if (!accountBalance || accountBalance <= 0) {
        console.warn('Saldo conto non valido per calcolo size, utilizzo valore predefinito');
        accountBalance = 10000; // Valore predefinito
    }
    
    if (!riskPercent || riskPercent <= 0) {
        console.warn('Percentuale di rischio non valida, utilizzo valore predefinito');
        riskPercent = 0.01; // 1% predefinito
    }
    
    if (!maxRiskPerTrade || maxRiskPerTrade <= 0) {
        maxRiskPerTrade = 0.02; // 2% predefinito
    }
    
    // Limita il rischio al massimo configurato per il profilo
    const effectiveRiskPercent = Math.min(riskPercent, maxRiskPerTrade);
    
    // Calcola il rischio monetario (quanto si è disposti a perdere)
    const riskAmount = accountBalance * effectiveRiskPercent;
    
    // Aggiusta la size in base alla volatilità
    // Alta volatilità = size ridotta, bassa volatilità = size aumentata
    let volatilityFactor = 1.0;
    if (volatility > 25) {
        // Alta volatilità, riduce la size
        volatilityFactor = 0.8;
    } else if (volatility < 10) {
        // Bassa volatilità, aumenta la size
        volatilityFactor = 1.2;
    }
    
    // Stima del valore di un pip/tick per i calcoli (valore teorico)
    // In un sistema reale, questo valore dipenderà dal tipo di asset e dalla leva
    const estimatedPipValue = accountBalance * 0.0001; // Stima semplicistica
    
    // Calcola la size base
    let positionSize = (riskAmount / estimatedPipValue) * volatilityFactor;
    
    // Arrotonda a due decimali per lotti standard/mini/micro
    positionSize = Math.round(positionSize * 100) / 100;
    
    // Limita la size a un valore ragionevole (max 5% del saldo per operazione)
    const maxSize = accountBalance * 0.05 / estimatedPipValue;
    positionSize = Math.min(positionSize, maxSize);
    
    return positionSize;
}

/**
 * Calcola livelli di scale-in per l'ingresso graduale in posizione
 * @param {number} entryPrice - Prezzo di entrata principale
 * @param {string} orderType - Tipo di ordine ('BUY' o 'SELL')
 * @param {Object} settings - Impostazioni di money management
 * @returns {Array<Object>} - Array di livelli di scale-in
 */
function calculateScaleInLevels(entryPrice, orderType, settings) {
    const levels = [];
    const isLong = orderType === 'BUY';
    const numLevels = settings.scaleInLevels || 3;
    
    // Determina lo step in percentuale per i livelli di ingresso
    const stepPercent = isLong ? -0.005 : 0.005; // 0.5% per livello
    
    // Distribuisce il volume totale sui livelli (primo livello è il principale)
    // es. [40%, 30%, 30%] per 3 livelli
    const volumeDistribution = [0.4];
    const remainingVolume = 0.6;
    const volumePerLevel = remainingVolume / (numLevels - 1);
    
    for (let i = 1; i < numLevels; i++) {
        volumeDistribution.push(volumePerLevel);
    }
    
    // Crea il primo livello (ingresso principale)
    levels.push({
        price: entryPrice,
        volumePercent: volumeDistribution[0],
        description: "Livello principale"
    });
    
    // Crea i livelli successivi
    for (let i = 1; i < numLevels; i++) {
        const priceDeviation = entryPrice * stepPercent * i;
        const levelPrice = entryPrice + priceDeviation;
        
        levels.push({
            price: levelPrice,
            volumePercent: volumeDistribution[i],
            description: `Scale-in #${i}`
        });
    }
    
    return levels;
}

/**
 * Calcola livelli di scale-out per l'uscita graduale dalla posizione
 * @param {number} entryPrice - Prezzo di entrata
 * @param {number} targetPrice - Prezzo target finale
 * @param {string} orderType - Tipo di ordine ('BUY' o 'SELL')
 * @param {Object} settings - Impostazioni di money management
 * @returns {Array<Object>} - Array di livelli di scale-out
 */
function calculateScaleOutLevels(entryPrice, targetPrice, orderType, settings) {
    const levels = [];
    const isLong = orderType === 'BUY';
    const numLevels = settings.scaleOutLevels || 3;
    
    // Determina lo step in percentuale per i livelli di uscita
    const totalMove = (targetPrice - entryPrice) / entryPrice;
    const stepPercent = totalMove / numLevels;
    
    // Distribuisce il volume totale sui livelli di uscita
    // es. [30%, 30%, 40%] per 3 livelli (ultimo più grande)
    const volumeDistribution = [];
    const baseVolume = 1 / numLevels;
    
    for (let i = 0; i < numLevels - 1; i++) {
        volumeDistribution.push(baseVolume * 0.9); // Leggermente inferiore
    }
    
    // Ultimo livello leggermente maggiore
    volumeDistribution.push(1 - volumeDistribution.reduce((sum, vol) => sum + vol, 0));
    
    // Crea i livelli di uscita
    for (let i = 0; i < numLevels; i++) {
        const percent = (i + 1) / numLevels;
        const levelPrice = entryPrice * (1 + stepPercent * (i + 1));
        
        levels.push({
            price: levelPrice,
            volumePercent: volumeDistribution[i],
            description: i === numLevels - 1 ? "Target finale" : `Profit parziale #${i+1}`
        });
    }
    
    return levels;
}

/**
 * Calcola il drawdown corrente in base alla storia del conto
 * @param {Array<Object>} accountHistory - Storia delle performance del conto
 * @returns {Object} - Statistiche di drawdown
 */
function calculateDrawdown(accountHistory) {
    if (!accountHistory || !accountHistory.length) {
        return {
            currentDrawdown: 0,
            maxDrawdown: 0,
            fromPeak: 0
        };
    }
    
    let peak = accountHistory[0].balance;
    let maxDrawdown = 0;
    let currentDrawdown = 0;
    let peakDate = accountHistory[0].date;
    
    for (const record of accountHistory) {
        if (record.balance > peak) {
            peak = record.balance;
            peakDate = record.date;
        }
        
        const drawdown = (peak - record.balance) / peak;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }
    
    // Calcola il drawdown corrente
    const currentBalance = accountHistory[accountHistory.length - 1].balance;
    currentDrawdown = (peak - currentBalance) / peak;
    
    return {
        currentDrawdown: currentDrawdown,
        maxDrawdown: maxDrawdown,
        fromPeak: peak,
        peakDate: peakDate
    };
}

/**
 * Verifica se una nuova operazione rispetta i limiti di rischio
 * @param {Object} accountInfo - Informazioni sul conto
 * @param {Array<Object>} openPositions - Posizioni già aperte
 * @param {Object} newPosition - Nuova posizione da verificare
 * @param {Object} settings - Impostazioni di money management
 * @returns {Object} - Risultato della verifica
 */
function validateRiskLimits(accountInfo, openPositions, newPosition, settings) {
    if (!accountInfo || !settings) {
        return {
            valid: false,
            reason: "Informazioni insufficienti per la validazione"
        };
    }
    
    // Calcola il rischio totale delle posizioni aperte
    let totalOpenRisk = 0;
    if (openPositions && openPositions.length > 0) {
        totalOpenRisk = openPositions.reduce((sum, position) => {
            const positionRisk = position.risk || 0;
            return sum + positionRisk;
        }, 0);
    }
    
    // Calcola il rischio della nuova posizione
    const newRisk = newPosition.risk || (newPosition.positionSize * 0.01); // Stima 1% se non specificato
    
    // Verifica limite di rischio per singola operazione
    if (newRisk > settings.maxRiskPerTrade) {
        return {
            valid: false,
            reason: `Rischio della posizione (${(newRisk * 100).toFixed(2)}%) eccede il massimo consentito (${(settings.maxRiskPerTrade * 100).toFixed(2)}%)`
        };
    }
    
    // Verifica limite di rischio giornaliero
    if (totalOpenRisk + newRisk > settings.maxDailyRisk) {
        return {
            valid: false,
            reason: `Rischio totale (${((totalOpenRisk + newRisk) * 100).toFixed(2)}%) eccede il massimo giornaliero (${(settings.maxDailyRisk * 100).toFixed(2)}%)`
        };
    }
    
    // Se passiamo tutte le verifiche, l'operazione è valida
    return {
        valid: true,
        totalRisk: totalOpenRisk + newRisk,
        remainingRisk: settings.maxDailyRisk - (totalOpenRisk + newRisk)
    };
}

/**
 * Aggiorna le impostazioni personalizzate di money management
 * @param {string} profileType - Tipo di profilo ('scalping', 'swing', 'position', 'longterm')
 * @param {Object} newSettings - Nuove impostazioni da applicare
 * @returns {Object} - Impostazioni aggiornate
 */
function updateMoneyManagementSettings(profileType, newSettings) {
    if (!profileType || !userSettings[profileType]) {
        console.error(`Tipo di profilo non valido: ${profileType}`);
        return null;
    }
    
    // Aggiorna solo le impostazioni specificate
    userSettings[profileType] = {
        ...userSettings[profileType],
        ...newSettings
    };
    
    // Salva le impostazioni nel localStorage
    try {
        localStorage.setItem('moneyManagementSettings', JSON.stringify(userSettings));
    } catch (error) {
        console.error('Errore nel salvare le impostazioni:', error);
    }
    
    return userSettings[profileType];
}

/**
 * Carica le impostazioni di money management salvate
 * @returns {boolean} - true se le impostazioni sono state caricate con successo
 */
function loadMoneyManagementSettings() {
    try {
        const savedSettings = localStorage.getItem('moneyManagementSettings');
        if (savedSettings) {
            userSettings = JSON.parse(savedSettings);
            return true;
        }
    } catch (error) {
        console.error('Errore nel caricamento delle impostazioni:', error);
    }
    
    return false;
}

/**
 * Ripristina le impostazioni predefinite per un profilo
 * @param {string} profileType - Tipo di profilo ('scalping', 'swing', 'position', 'longterm')
 * @returns {Object} - Impostazioni ripristinate
 */
function resetToDefaultSettings(profileType) {
    if (!profileType) {
        // Ripristina tutte le impostazioni
        userSettings = JSON.parse(JSON.stringify(moneyManagementDefaults));
    } else if (moneyManagementDefaults[profileType]) {
        // Ripristina solo le impostazioni del profilo specificato
        userSettings[profileType] = JSON.parse(JSON.stringify(moneyManagementDefaults[profileType]));
    } else {
        console.error(`Tipo di profilo non valido: ${profileType}`);
        return null;
    }
    
    // Salva le impostazioni nel localStorage
    try {
        localStorage.setItem('moneyManagementSettings', JSON.stringify(userSettings));
    } catch (error) {
        console.error('Errore nel salvare le impostazioni:', error);
    }
    
    return profileType ? userSettings[profileType] : userSettings;
}

/**
 * Genera un report di money management
 * @param {Object} accountInfo - Informazioni sul conto
 * @param {string} profileName - Nome del profilo di trading
 * @returns {string} - Report formattato
 */
function generateMoneyManagementReport(accountInfo, profileName) {
    const settings = getMoneyManagementSettings(accountInfo, profileName);
    const profile = profileName.toLowerCase().replace(/\s+/g, '');
    let profileType;
    
    // Determina il tipo di profilo
    if (profile.includes('scalp') || profile.includes('falco')) {
        profileType = 'scalping';
    } else if (profile.includes('swing') || profile.includes('serpente')) {
        profileType = 'swing';
    } else if (profile.includes('position') || profile.includes('orso')) {
        profileType = 'position';
    } else if (profile.includes('longterm') || profile.includes('tartaruga')) {
        profileType = 'longterm';
    } else {
        profileType = 'swing'; // Default
    }
    
    // Calcola i valori monetari
    const maxRiskAmount = accountInfo.balance * settings.maxRiskPerTrade;
    const maxDailyRiskAmount = accountInfo.balance * settings.maxDailyRisk;
    const maxDrawdownAmount = accountInfo.balance * settings.maxDrawdown;
    
    // Genera il report
    return `
🔒 REPORT MONEY MANAGEMENT (${profileName})

💰 Capitale disponibile: $${accountInfo.balance.toFixed(2)}

⚙️ Parametri di rischio:
   • Rischio massimo per operazione: ${(settings.maxRiskPerTrade * 100).toFixed(1)}% ($${maxRiskAmount.toFixed(2)})
   • Rischio massimo giornaliero: ${(settings.maxDailyRisk * 100).toFixed(1)}% ($${maxDailyRiskAmount.toFixed(2)})
   • Drawdown massimo tollerato: ${(settings.maxDrawdown * 100).toFixed(1)}% ($${maxDrawdownAmount.toFixed(2)})

📊 Strategie di posizionamento:
   • Livelli di ingresso graduale: ${settings.scaleInLevels}
   • Livelli di uscita graduale: ${settings.scaleOutLevels}
   • Leva consigliata: ${settings.recommendedLeverage}x

⚠️ Volatilità:
   • Fattore di aggiustamento: ${settings.volatilityMultiplier.toFixed(1)}x
   (Un valore > 1 indica posizioni più grandi in condizioni di bassa volatilità)

💡 Consiglio operativo:
   ${getMoneyManagementAdvice(profileType, accountInfo.balance)}
`;
}

/**
 * Genera un consiglio operativo in base al profilo e al capitale
 * @param {string} profileType - Tipo di profilo
 * @param {number} balance - Saldo del conto
 * @returns {string} - Consiglio operativo
 */
function getMoneyManagementAdvice(profileType, balance) {
    switch(profileType) {
        case 'scalping':
            if (balance < 1000) {
                return "Con un capitale limitato, concentrati su pochi trade di qualità. Usa lotti micro e limita a 2-3 operazioni giornaliere.";
            } else if (balance < 5000) {
                return "Usa lotti mini o micro. Mantieni un diario di trading dettagliato e aumenta progressivamente la size solo dopo 20+ operazioni profittevoli consecutive.";
            } else {
                return "Puoi implementare una strategia di scalping completa. Considera l'automazione parziale per le entrate basate sui segnali e gestisci manualmente le uscite.";
            }
        
        case 'swing':
            if (balance < 2000) {
                return "Concentrati su 2-3 asset alla volta. Usa il fine settimana per analizzare i grafici e preparare gli ordini pendenti per la settimana.";
            } else if (balance < 10000) {
                return "Diversifica su 4-6 asset. Implementa uno scaling prudente con livelli preimpostati di presa di profitto parziale.";
            } else {
                return "Puoi gestire un portafoglio diversificato. Considera l'utilizzo di opzioni per hedging e per generare rendimento aggiuntivo sulle posizioni aperte.";
            }
            
        case 'position':
            if (balance < 5000) {
                return "Anche con capitale limitato, le posizioni a lungo termine funzionano bene. Concentrati sui fondamentali e ignora la volatilità di breve periodo.";
            } else if (balance < 20000) {
                return "Mantieni un mix equilibrato di posizioni in diversi settori. Usa il calendar spreading per ottimizzare gli ingressi su periodi più lunghi.";
            } else {
                return "Considera strategie avanzate come il core-satellite: base del portafoglio stabile con posizioni tattiche per sfruttare le opportunità di medio termine.";
            }
            
        case 'longterm':
            if (balance < 10000) {
                return "L'investimento a lungo termine funziona con qualsiasi capitale. Concentrati sull'accumulazione graduale e sui dividendi reinvestiti.";
            } else if (balance < 50000) {
                return "Diversifica tra 10-15 asset di diversi settori e aree geografiche. Implementa strategie value investing con un focus sui fondamentali.";
            } else {
                return "Struttura un portafoglio completo con allocazione strategica. Considera l'uso di ETF per l'esposizione a classi di asset complesse integrati con singoli titoli selezionati.";
            }
            
        default:
            return "Adatta la dimensione delle posizioni alla tua tolleranza al rischio. Inizia con posizioni più piccole e aumenta gradualmente con l'esperienza.";
    }
}

// Inizializza le impostazioni al caricamento del modulo
loadMoneyManagementSettings();

// Esporta le funzioni
export {
    getMoneyManagementSettings,
    calculatePositionSize,
    calculateScaleInLevels,
    calculateScaleOutLevels,
    calculateDrawdown,
    validateRiskLimits,
    updateMoneyManagementSettings,
    resetToDefaultSettings,
    generateMoneyManagementReport
};