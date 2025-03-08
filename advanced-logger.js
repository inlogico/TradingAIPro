/**
 * Advanced Logger
 * Questo modulo fornisce un sistema di logging avanzato per TradingAI Pro.
 * Permette di loggare messaggi a vari livelli (debug, info, warn, error) con timestamp,
 * e può essere esteso per inviare i log ad un server remoto.
 */

class AdvancedLogger {
  constructor() {
    // Definizione dei livelli di log
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    // Imposta il livello di log corrente (default: debug)
    this.currentLevel = this.levels.debug;
    // URL opzionale per l'invio remoto dei log
    this.remoteLoggingUrl = null;
    // Contatore fallimenti per logging remoto
    this._failureCount = 0;
    // Dimensione massima buffer log
    this.maxBufferSize = 1000;
    // Buffer per i log
    this.logBuffer = [];
  }

  /**
   * Imposta il livello di log corrente.
   * @param {string} level - "debug", "info", "warn" o "error"
   */
  setLogLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = this.levels[level];
    } else {
      console.warn("Livello di log non valido:", level);
    }
  }

  /**
   * Abilita il logging remoto specificando l'URL di destinazione.
   * @param {string} url - URL del server che riceverà i log
   */
  enableRemoteLogging(url) {
    this.remoteLoggingUrl = url;
    this._failureCount = 0; // Resetta il contatore dei fallimenti
  }

  /**
   * Disabilita temporaneamente il logging remoto
   * @param {number} timeoutMs - Timeout in ms prima di riattivare il logging
   */
  disableRemoteLoggingTemporarily(timeoutMs = 300000) {
    const oldUrl = this.remoteLoggingUrl;
    this.remoteLoggingUrl = null;
    
    setTimeout(() => {
      this.remoteLoggingUrl = oldUrl;
      this._failureCount = 0;
    }, timeoutMs);
  }

  /**
   * Registra un messaggio al livello specificato.
   * @param {string} level - Livello del log ("debug", "info", "warn", "error")
   * @param  {...any} args - Messaggi o dati da loggare
   */
  log(level, ...args) {
    if (this.levels[level] >= this.currentLevel) {
      const timestamp = new Date().toISOString();
      let message = args[0] || '';
      let data = args.length > 1 ? args.slice(1) : undefined;
      
      // Gestisci oggetti/errori nel messaggio
      if (typeof message === 'object') {
        if (message instanceof Error) {
          data = data || {};
          data.stack = message.stack;
          message = message.message;
        } else {
          data = message;
          message = 'Object data';
        }
      }
      
      // Formato del log
      const logEntry = {
        timestamp,
        level: level.toUpperCase(),
        message,
        data: data
      };
      
      // Aggiungi al buffer
      this.addToBuffer(logEntry);
      
      // Formatta per console
      const consoleMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
      
      // Usa il metodo console appropriato in base al livello
      switch (level) {
        case "debug":
          console.debug(consoleMessage, data || '');
          break;
        case "info":
          console.info(consoleMessage, data || '');
          break;
        case "warn":
          console.warn(consoleMessage, data || '');
          break;
        case "error":
          console.error(consoleMessage, data || '');
          break;
        default:
          console.log(consoleMessage, data || '');
      }
      
      // Se è abilitato il logging remoto, invia il log
      if (this.remoteLoggingUrl) {
        this.sendRemoteLog(logEntry);
      }
    }
  }

  /**
   * Aggiunge un entry al buffer di log
   * @param {Object} entry - Entry di log
   */
  addToBuffer(entry) {
    this.logBuffer.push(entry);
    
    // Limita la dimensione del buffer
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift(); // Rimuovi il log più vecchio
    }
  }

  /**
   * Ottiene il buffer di log corrente
   * @returns {Array} Array di log entries
   */
  getLogBuffer() {
    return [...this.logBuffer];
  }

  /**
   * Metodi di log convenienza
   */
  debug(...args) {
    this.log("debug", ...args);
  }

  info(...args) {
    this.log("info", ...args);
  }

  warn(...args) {
    this.log("warn", ...args);
  }

  error(...args) {
    this.log("error", ...args);
  }

  /**
   * Invia il log ad un server remoto (se configurato).
   * @param {Object} logEntry - Oggetto contenente il livello, il timestamp e il messaggio
   */
  async sendRemoteLog(logEntry) {
    if (!this.remoteLoggingUrl) return;
    
    try {
      const response = await fetch(this.remoteLoggingUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(logEntry),
        // Imposta un timeout per la richiesta
        signal: AbortSignal.timeout(5000) // 5 secondi timeout
      });
      
      if (!response.ok) {
        throw new Error(`Status HTTP: ${response.status}`);
      }
      
      // Reset del contatore in caso di successo
      this._failureCount = 0;
    } catch (error) {
      console.error("Errore nell'invio del log remoto:", error);
      
      // Incrementa il contatore di fallimenti
      this._failureCount++;
      
      // Disabilita temporaneamente il logging remoto dopo troppi errori
      if (this._failureCount > 5) {
        console.warn("Troppe richieste di log fallite, logging remoto temporaneamente disabilitato");
        this.disableRemoteLoggingTemporarily();
      }
    }
  }
}

// Esporta una istanza singleton del logger per l'utilizzo globale
const logger = new AdvancedLogger();
export default logger;
