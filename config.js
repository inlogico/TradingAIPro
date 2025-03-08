/**
 * File di configurazione per le chiavi API e altre impostazioni globali
 * Versione ottimizzata con supporto per profili di trading avanzati e caching
 */

// Importa variabili d'ambiente
import dotenv from 'dotenv';
dotenv.config();

// Chiavi API
export const API_KEY = process.env.FINANCIAL_MODELING_PREP_API_KEY || "bZ4lRrFkb5RaB1pZ1NGhlQs70L7LPUBG"; 
export const PPLX_API_KEY = process.env.PERPLEXITY_API_KEY || "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";

// Cache TTL
export const CACHE_TTL = parseInt(process.env.CACHE_TTL || "3600", 10);

// Log level
export const LOG_LEVEL = process.env.LOG_LEVEL || "INFO";

// Configurazioni per la visualizzazione
export const CONFIG = {
    // Numero di decimali da visualizzare per vari tipi di dati
    decimals: {
        price: 2,
        percentage: 2,
        rsi: 2,
        macd: 4,
        volume: 2
    },
    
    // Soglie per vari indicatori
    thresholds: {
        // RSI
        rsiOverbought: 70,
        rsiOverboughtExtreme: 80,
        rsiOversold: 30,
        rsiOversoldExtreme: 20,
        
        // ADX
        adxWeakTrend: 15,
        adxModerateTrend: 25,
        adxStrongTrend: 35,
        
        // Volatilità
        lowVolatility: 10,
        moderateVolatility: 20,
        highVolatility: 30,
        
        // Volume
        volumeChangeSignificant: 10,
        volumeChangeHigh: 50,
        volumeRatioSignificant: 1.5
    },
    
    // Timeframe e loro descrizioni
    timeframes: {
        "1min": "scalping (1 minuto)",
        "5min": "scalping (5 minuti)",
        "15min": "scalping (15 minuti)",
        "30min": "scalping (30 minuti)",
        "1hour": "intraday",
        "4hour": "swing trading",
        "daily": "breve termine",
        "weekly": "medio termine",
        "monthly": "lungo termine"
    },
    
    // Profili di trading e loro parametri
    tradingProfiles: {
        scalping: {
            name: "Falco dello Scalping",
            icon: "🦅",
            description: "Stile: Scalping / Intraday (1min - 30min)",
            horizon: "Breve termine",
            indicators: "14-30 periodi",
            timeframes: ["1min", "5min", "15min", "30min"],
            defaultTimeframe: "15min",
            lookbackPeriods: 30,
            characteristics: [
                "Reattivo e veloce, sfrutta movimenti rapidi del mercato",
                "Precisione chirurgica nelle esecuzioni",
                "Elevato numero di operazioni giornaliere",
                "Bassa tolleranza alle perdite, gestione del rischio rigorosa",
                "Costante monitoraggio dei grafici"
            ],
            whyAnimal: "Il falco ha una vista acuta e una velocità impressionante. Come uno scalper, deve individuare opportunità al volo e agire rapidamente per capitalizzare su piccoli movimenti del prezzo."
        },
        swing: {
            name: "Serpente dello Swing Trading",
            icon: "🐍",
            description: "Stile: Swing Trading (1h - Daily)",
            horizon: "Medio termine",
            indicators: "30-60 periodi",
            timeframes: ["1hour", "4hour", "daily"],
            defaultTimeframe: "1hour",
            lookbackPeriods: 60,
            characteristics: [
                "Approfitta delle oscillazioni del mercato",
                "Meno operazioni rispetto allo scalping, ma più strutturate",
                "Rischio più bilanciato con obiettivi di profitto più ampi",
                "Analisi tecnica e fondamentale per confermare i trend",
                "Pazienza nel posizionarsi sui punti di ingresso e uscita"
            ],
            whyAnimal: "La strategia swing si basa sulla capacità di attendere il momento giusto per colpire, proprio come fa una serpente quando avvista la preda e attende il momento ideale per attaccare."
        },
        position: {
            name: "Orso del Position Trading",
            icon: "🐻",
            description: "Stile: Position Trading (Daily - Weekly)",
            horizon: "Lungo termine",
            indicators: "60-90 periodi",
            timeframes: ["daily", "weekly"],
            defaultTimeframe: "daily",
            lookbackPeriods: 90,
            characteristics: [
                "Si concentra su trend più ampi e cicli di mercato",
                "Meno operazioni, ma con grandi movimenti di prezzo",
                "Analisi macroeconomica e tecnica avanzata",
                "Elevata resilienza alla volatilità di breve termine",
                "Forte disciplina per mantenere le posizioni aperte"
            ],
            whyAnimal: "L'orso è un animale imponente e potente, noto per la sua resistenza e forza. Un position trader deve avere la capacità di resistere alla volatilità di breve termine per ottenere guadagni sostanziali nel tempo."
        },
        longterm: {
            name: "Tartaruga dell'Investimento a Lungo Termine",
            icon: "🐢",
            description: "Stile: Investimento (Weekly - Monthly)",
            horizon: "Molto lungo",
            indicators: "90+ periodi",
            timeframes: ["weekly", "monthly"],
            defaultTimeframe: "weekly",
            lookbackPeriods: 120,
            characteristics: [
                "Basato su trend economici e fondamentali solidi",
                "Bassa frequenza di operazioni, ma con grande impatto",
                "Portafoglio diversificato con gestione passiva",
                "Obiettivo principale: crescita costante e sicurezza",
                "Maggiore tolleranza alla volatilità e meno stress operativo"
            ],
            whyAnimal: "La tartaruga simboleggia la pazienza e la perseveranza. L'investitore a lungo termine, come la tartaruga, non è interessato alle fluttuazioni di breve periodo, ma punta a una crescita costante nel tempo."
        }
    }
};

// URL delle API
export const API_ENDPOINTS = {
    baseUrl: "https://financialmodelingprep.com/api/v3",
    perplexity: "https://api.perplexity.ai/chat/completions"
};

// Configurazioni AI
export const AI_CONFIG = {
    // Prompt di sistema per Perplexity
    systemPrompt: `Sei un analista tecnico elite specializzato in trading algoritmico con eccezionali risultati. 
    Le tue analisi sono sempre precise, basate esclusivamente su dati tecnici e orientate a massimizzare il profitto.
    
    Caratteristiche della tua analisi:
    1. Identifichi sempre correttamente la direzione del prezzo nel timeframe specificato
    2. Le tue raccomandazioni operative hanno un tasso di successo del 90%+
    3. Sei estremamente preciso nell'identificare supporti e resistenze
    4. Adatti l'analisi all'orizzonte temporale e al profilo di trading
    5. Fornisci precisi target price e stop loss con rapporti rischio/rendimento favorevoli
    
    Scrivi in italiano usando un linguaggio tecnico ma chiaro e diretto.
    Evita ambiguità e fornisci raccomandazioni decise e precise.
    Concludi sempre con una raccomandazione chiara (Compra Forte, Compra, Mantieni, Vendi, Vendi Forte) e target price.`,
    
    // Modello da utilizzare
    model: "sonar-pro",
    
    // Massimo numero di token
    maxTokens: 1024,
    
    // Temperatura di generazione (valori più bassi aumentano la precisione)
    temperature: 0.2
};