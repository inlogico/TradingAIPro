/**
 * Modulo per l'analisi dei profili di trading e la loro integrazione con l'analisi tecnica
 * Fornisce funzioni per personalizzare l'analisi in base al profilo selezionato
 */

/**
 * Estrae le caratteristiche rilevanti di un profilo per l'analisi corrente
 * @param {Object} profile - Profilo di trading 
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @returns {string} - Caratteristiche rilevanti
 */
function getProfileRelevantFeatures(profile, technicalIndicators) {
    if (!profile || !profile.name) return "N/D";
    
    // Identifica le caratteristiche più rilevanti in base alle condizioni di mercato
    const volatility = technicalIndicators.volatility?.value 
        ? parseFloat(technicalIndicators.volatility.value) 
        : 15; // Valore predefinito
    
    const momentum = technicalIndicators.momentum?.rsi 
        ? technicalIndicators.momentum.rsi 
        : 50; // Valore predefinito
    
    const trend = technicalIndicators.trend?.adx 
        ? technicalIndicators.trend.adx 
        : 20; // Valore predefinito
    
    switch(profile.name.toLowerCase().replace(/\s+/g, '')) {
        case "falcodelloscalping":
            if (volatility > 20) {
                return "Elevata reattività in ambiente volatile, molte opportunità di operatività, focus su rapidi movimenti di prezzo";
            } else if (momentum > 70 || momentum < 30) {
                return "Attenzione ai punti di ipercomprato/ipervenduto per inversioni rapide, operazioni con uscita veloce";
            } else {
                return "Operatività limitata in condizioni range-bound, attenzione ai breakout dai livelli chiave";
            }
        
        case "serpenteoftheswingtrading":
        case "serpentedelloswingtrading":
            if (trend > 25) {
                return "Trend ben definito, ideale per posizionamento nella direzione principale del movimento";
            } else if (volatility > 15 && volatility < 25) {
                return "Volatilità media, attenzione alle oscillazioni tra supporti e resistenze";
            } else {
                return "Focus su pattern di inversione e conferme di momentum";
            }
        
        case "orsodellpositiontrading":
        case "orsodelpositiontrading":
            if (trend > 30) {
                return "Forte trend in atto, opportunità di posizionamento con ampio orizzonte temporale";
            } else {
                return "Attendere consolidamento e chiari segnali direzionali prima di aprire posizioni";
            }
        
        case "tartarugadell'investimentoalungotermine":
        case "tartarugadell'investimento":
        case "tartarugadellinvestimento":
            return "Focus su analisi fondamentale e trend di lungo periodo, ignorare rumore di breve termine";
        
        default:
            return "Caratteristiche generali di analisi tecnica adattate al profilo di trading";
    }
}

/**
 * Determina gli indicatori chiave più rilevanti per il profilo
 * @param {Object} profile - Profilo di trading
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @returns {string} - Indicatori chiave
 */
function getProfileKeyIndicators(profile, technicalIndicators) {
    if (!profile || !profile.name) return "N/D";
    
    const profileType = profile.name.toLowerCase().replace(/\s+/g, '');
    
    switch(profileType) {
        case "falcodelloscalping":
            return "RSI a breve, Banda di Bollinger, Volume, Pattern a breve termine";
        
        case "serpenteoftheswingtrading":
        case "serpentedelloswingtrading":
            return "MACD, RSI, SMA/EMA, Livelli di supporto e resistenza";
        
        case "orsodellpositiontrading":
        case "orsodelpositiontrading":
            return "ADX, SMA di lungo periodo, MACD, Pattern di chart maggiori";
        
        case "tartarugadell'investimentoalungotermine":
        case "tartarugadell'investimento":
        case "tartarugadellinvestimento":
            return "SMA(200), Trend di lungo periodo, Pattern di chart ciclici";
        
        default:
            return "Indicatori tecnici standard adattati al timeframe";
    }
}

/**
 * Determina il livello di rischio appropriato per il profilo
 * @param {Object} profile - Profilo di trading
 * @returns {string} - Livello di rischio consigliato
 */
function getProfileRiskLevel(profile) {
    if (!profile || !profile.name) return "N/D";
    
    const profileType = profile.name.toLowerCase().replace(/\s+/g, '');
    
    switch(profileType) {
        case "falcodelloscalping":
            return "Rischio alto, stop loss ravvicinati, esposizione limitata per operazione (1-2% del capitale)";
        
        case "serpenteoftheswingtrading":
        case "serpentedelloswingtrading":
            return "Rischio medio, stop loss su livelli tecnici, esposizione 2-3% del capitale";
        
        case "orsodellpositiontrading":
        case "orsodelpositiontrading":
            return "Rischio medio-basso, stop loss ampi, esposizione 3-5% del capitale";
        
        case "tartarugadell'investimentoalungotermine":
        case "tartarugadell'investimento":
        case "tartarugadellinvestimento":
            return "Rischio basso, ampio margine di oscillazione, esposizione fino al 10% per posizione";
        
        default:
            return "Livello di rischio medio con adattamento al mercato";
    }
}

/**
 * Genera suggerimenti di gestione della posizione in base al profilo
 * @param {Object} profile - Profilo di trading
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @param {string} recommendation - Raccomandazione generata
 * @returns {string} - Suggerimenti di gestione della posizione
 */
function getPositionManagementTips(profile, technicalIndicators, recommendation) {
    if (!profile || !profile.name || !recommendation) return "N/D";
    
    const profileType = profile.name.toLowerCase().replace(/\s+/g, '');
    const isLong = recommendation.includes("Compra");
    const isShort = recommendation.includes("Vendi");
    const volatility = technicalIndicators.volatility?.value 
        ? parseFloat(technicalIndicators.volatility.value) 
        : 15;
    
    let tips = "";
    
    switch(profileType) {
        case "falcodelloscalping":
            if (isLong) {
                tips = "Chiusura rapida al raggiungimento del target. ";
                tips += volatility > 20 
                    ? "Usa trailing stop a 1-2 punti dal massimo. "
                    : "Stop loss fisso sotto l'ultimo minimo. ";
                tips += "Prendi profitto parziale ogni +0.5%";
            } else if (isShort) {
                tips = "Chiusura rapida al raggiungimento del target. ";
                tips += volatility > 20 
                    ? "Usa trailing stop a 1-2 punti dal minimo. "
                    : "Stop loss fisso sopra l'ultimo massimo. ";
                tips += "Prendi profitto parziale ogni -0.5%";
            }
            break;
        
        case "serpenteoftheswingtrading":
        case "serpentedelloswingtrading":
            if (isLong) {
                tips = "Mantieni per 3-5 giorni o fino al test della resistenza. ";
                tips += "Stop loss sotto supporto recente. ";
                tips += "Considera profit taking parziale a +3%";
            } else if (isShort) {
                tips = "Mantieni per 3-5 giorni o fino al test del supporto. ";
                tips += "Stop loss sopra resistenza recente. ";
                tips += "Considera profit taking parziale a -3%";
            }
            break;
        
        case "orsodellpositiontrading":
        case "orsodelpositiontrading":
            if (isLong) {
                tips = "Mantieni per 2-4 settimane o fino a segnale di inversione. ";
                tips += "Stop loss sulla media mobile a 50 periodi. ";
                tips += "Prendi profitto parziale su resistenza maggiore";
            } else if (isShort) {
                tips = "Mantieni per 2-4 settimane o fino a segnale di inversione. ";
                tips += "Stop loss sulla media mobile a 50 periodi. ";
                tips += "Prendi profitto parziale su supporto maggiore";
            }
            break;
        
case "tartarugadell'investimentoalungotermine":
        case "tartarugadell'investimento":
        case "tartarugadellinvestimento":
            if (isLong) {
                tips = "Accumula gradualmente la posizione. ";
                tips += "Stop loss solo in caso di cambio di trend di lungo periodo. ";
                tips += "Ignora volatilità di breve termine e considera ribilanciamento trimestrale/semestrale";
            } else if (isShort) {
                // Nota: lo short non è tipico di un investitore a lungo termine, ma potrebbe essere un hedge
                tips = "Mantieni come protezione per il resto del portafoglio. ";
                tips += "Rivedi la posizione mensilmente in base al trend di lungo periodo. ";
            }
            break;
        
        default:
            tips = "Gestione standard della posizione con stop loss e take profit adeguati al timeframe";
    }
    
    return tips;
}

/**
 * Adatta la raccomandazione al profilo di trading
 * @param {Object} profile - Profilo di trading
 * @param {string} baseRecommendation - Raccomandazione base generata dall'analisi
 * @param {Object} technicalIndicators - Indicatori tecnici
 * @returns {string} - Raccomandazione adattata al profilo
 */
function adaptRecommendationToProfile(profile, baseRecommendation, technicalIndicators) {
    if (!profile || !profile.name || !baseRecommendation) return baseRecommendation;
    
    const profileType = profile.name.toLowerCase().replace(/\s+/g, '');
    const volatility = technicalIndicators.volatility?.value 
        ? parseFloat(technicalIndicators.volatility.value) 
        : 15;
    const rsi = technicalIndicators.momentum?.rsi 
        ? technicalIndicators.momentum.rsi 
        : 50;
    const adx = technicalIndicators.trend?.adx 
        ? technicalIndicators.trend.adx 
        : 20;
    
    // Modifica la raccomandazione in base al profilo e alle condizioni di mercato
    switch(profileType) {
        case "falcodelloscalping":
            // Lo scalper ha bisogno di volatilità e movimento chiaro
            if (volatility < 10 && baseRecommendation.includes("Compra")) {
                return "Mantieni - Volatilità insufficiente per scalping";
            }
            if (adx < 15 && (baseRecommendation.includes("Compra") || baseRecommendation.includes("Vendi"))) {
                return "Mantieni - Trend troppo debole per scalping";
            }
            // Amplifica i segnali forti per lo scalper che cerca movimenti rapidi
            if (baseRecommendation === "Compra" && rsi < 40) {
                return "Compra Forte - Opportunità di rimbalzo da ipervenduto";
            }
            if (baseRecommendation === "Vendi" && rsi > 60) {
                return "Vendi Forte - Opportunità di correzione da ipercomprato";
            }
            break;
            
        case "serpenteoftheswingtrading":
        case "serpentedelloswingtrading":
            // Lo swing trader ha bisogno di trend definiti
            if (adx < 20 && (baseRecommendation.includes("Forte"))) {
                // Downgrade dei segnali "Forte" se il trend non è abbastanza definito
                return baseRecommendation.replace("Forte", "").trim();
            }
            break;
            
        case "orsodellpositiontrading":
        case "orsodelpositiontrading":
            // Position trader richiede trend forti e chiari
            if (adx < 25 && baseRecommendation.includes("Compra")) {
                return "Mantieni - Attendere conferma di trend per position trading";
            }
            if (volatility > 25 && baseRecommendation !== "Mantieni") {
                return "Mantieni - Volatilità eccessiva, attendere stabilizzazione";
            }
            break;
            
        case "tartarugadell'investimentoalungotermine":
        case "tartarugadell'investimento":
        case "tartarugadellinvestimento":
            // Investitore a lungo termine evita cambi frequenti
            if (baseRecommendation === "Compra") {
                return "Compra - Accumula gradualmente, approccio a lungo termine";
            }
            if (baseRecommendation === "Vendi") {
                return "Mantieni - Rivaluta solo su cambio trend di lungo periodo";
            }
            if (baseRecommendation === "Compra Forte") {
                return "Compra - Opportunità di investimento a lungo termine";
            }
            if (baseRecommendation === "Vendi Forte") {
                return "Vendi - Considera riallocazione strategica";
            }
            break;
    }
    
    return baseRecommendation;
}

// Esporta le funzioni
export {
    getProfileRelevantFeatures,
    getProfileKeyIndicators,
    getProfileRiskLevel,
    getPositionManagementTips,
    adaptRecommendationToProfile
};