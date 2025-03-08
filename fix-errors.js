/**
 * Script per correggere gli errori di timing e riferimenti DOM
 * Questo script deve essere posizionato prima degli altri script nell'HTML
 */

// Crea oggetti vuoti per i moduli se non esistono
if (typeof window.Logger === 'undefined') {
    window.Logger = {
        debug: console.debug.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console)
    };
}

// Salva il metodo originale prima di sovrascriverlo
const originalGetElementById = document.getElementById.bind(document);

// Funzione per assicurarsi che un elemento esista prima di accedervi
function ensureDOMElement(id, tagName = 'div', defaultAttributes = {}) {
  // Usa la funzione originale, non quella sovrascritta
  let element = originalGetElementById(id);
  
  if (!element) {
    console.log(`Creazione elemento mancante: ${id}`);
    element = document.createElement(tagName);
    element.id = id;
    
    // Applica attributi predefiniti
    for (const [key, value] of Object.entries(defaultAttributes)) {
      if (key === 'innerHTML') {
        element.innerHTML = value;
      } else if (key === 'style') {
        Object.assign(element.style, value);
      } else {
        element.setAttribute(key, value);
      }
    }
    
    // Aggiungi al body per maggiore compatibilità
    document.body.appendChild(element);
  }
  
  return element;
}

// Wrappa document.getElementById per garantire che ritorni sempre un elemento valido
document.getElementById = function(id) {
  // Prima prova il metodo originale
  const element = originalGetElementById(id);
  
  // Se non lo trova, crea un elemento appropriato in base all'id
  if (!element) {
    console.log(`Elemento ${id} non trovato, creazione elemento temporaneo`);
    
    if (id === 'tradingProfile') {
      return ensureDOMElement('tradingProfile', 'select', {
        innerHTML: `
          <option value="scalping">🦅 Falco dello Scalping</option>
          <option value="swing" selected>🐍 Serpente dello Swing Trading</option>
          <option value="position">🐻 Orso del Position Trading</option>
          <option value="longterm">🐢 Tartaruga dell'Investimento</option>
        `,
        style: { display: 'none' }
      });
    } 
    else if (id === 'profileInfo') {
      return ensureDOMElement('profileInfo', 'div', {
        className: 'profile-info',
        style: { display: 'none' }
      });
    }
    else if (id === 'output') {
      return ensureDOMElement('output', 'pre');
    }
    else if (id === 'fetchDataBtn' || id === 'runAnalysisBtn' || id === 'downloadCsvBtn' || id === 'clearCacheBtn' || id === 'refreshDataBtn') {
      return ensureDOMElement(id, 'button');
    }
    else if (id === 'symbol') {
      return ensureDOMElement('symbol', 'input', {
        type: 'text',
        placeholder: 'Es. AAPL, MSFT, TSLA...'
      });
    }
    else if (id === 'technicalOverview') {
      return ensureDOMElement('technicalOverview', 'div');
    }
    else if (id === 'sentimentOutput' || id === 'aiAnalysisOutput' || id === 'orderSummaryOutput') {
      return ensureDOMElement(id, 'div');
    }
    else if (id === 'sentimentContainer' || id === 'aiAnalysisContainer' || id === 'orderSummaryContainer') {
      return ensureDOMElement(id, 'div', {
        className: id.replace('Container', '-container'),
        style: { display: 'none' }
      });
    }
    
    // Fallback generico per altri elementi
    return ensureDOMElement(id);
  }
  
  return element;
};

// Sicurezza per le operazioni DOM asincrone
window.domSafeOperation = function(callback) {
  // Se il DOM è già pronto, esegui subito
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(callback, 0);
  } else {
    // Altrimenti attendi il caricamento del DOM
    document.addEventListener('DOMContentLoaded', callback);
  }
};

// Inizializza funzioni stub per prevenire errori temporanei
if (!window.fetchAllData) window.fetchAllData = function() { console.log('fetchAllData stub chiamato'); };
if (!window.runAIAnalysis) window.runAIAnalysis = function() { console.log('runAIAnalysis stub chiamato'); };
if (!window.fetchSentimentAnalysis) window.fetchSentimentAnalysis = function() { console.log('fetchSentimentAnalysis stub chiamato'); };
if (!window.updateProfileInfo) window.updateProfileInfo = function() { console.log('updateProfileInfo stub chiamato'); };
if (!window.copyOrderToClipboard) window.copyOrderToClipboard = function() { console.log('copyOrderToClipboard stub chiamato'); };
if (!window.clearCache) window.clearCache = function() { console.log('clearCache stub chiamato'); };

// Overriding sicuro dei metodi di aggiunta listener per prevenire errori
const originalAddEventListener = HTMLElement.prototype.addEventListener;
HTMLElement.prototype.addEventListener = function(type, listener, options) {
  try {
    // Se l'elemento non è nel DOM, aggiungi quando sarà pronto
    if (!document.body.contains(this)) {
      console.log(`Aggiungo evento ${type} a elemento non nel DOM`, this);
      window.domSafeOperation(() => {
        if (document.body.contains(this)) {
          originalAddEventListener.call(this, type, listener, options);
        }
      });
    } else {
      originalAddEventListener.call(this, type, listener, options);
    }
  } catch (e) {
    console.error(`Errore nell'aggiunta dell'event listener ${type}:`, e);
  }
};

// Verifica compatibilità API
if (!window.fetch) {
  console.error("Fetch API non supportata in questo browser. L'applicazione potrebbe non funzionare correttamente.");
}

// Gestione globale delle promise non catturate
window.addEventListener('unhandledrejection', function(event) {
  console.error("Promise non gestita:", event.reason);
});

// Log di inizializzazione
console.log('Script di correzione errori caricato!');