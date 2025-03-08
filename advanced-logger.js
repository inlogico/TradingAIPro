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
  }

  /**
   * Registra un messaggio al livello specificato.
   * @param {string} level - Livello del log ("debug", "info", "warn", "error")
   * @param  {...any} args - Messaggi o dati da loggare
   */
  log(level, ...args) {
    if (this.levels[level] >= this.currentLevel) {
      const timestamp = new Date().toISOString();
      const message = `[${timestamp}] [${level.toUpperCase()}] ${args.join(" ")}`;
      
      // Usa il metodo console appropriato in base al livello
      switch (level) {
        case "debug":
          console.debug(message);
          break;
        case "info":
          console.info(message);
          break;
        case "warn":
          console.warn(message);
          break;
        case "error":
          console.error(message);
          break;
        default:
          console.log(message);
      }
      
      // Se è abilitato il logging remoto, invia il log
      if (this.remoteLoggingUrl) {
        this.sendRemoteLog({ level, timestamp, message });
      }
    }
  }

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
    try {
      await fetch(this.remoteLoggingUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(logEntry)
      });
    } catch (error) {
      console.error("Errore nell'invio del log remoto:", error);
    }
  }
}

// Esporta una istanza singleton del logger per l'utilizzo globale
const logger = new AdvancedLogger();
export default logger;
