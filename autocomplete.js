/**
 * Modulo per l'implementazione dell'autocompletamento nella barra di ricerca degli asset
 * Gestisce il caricamento, la ricerca e la visualizzazione dei suggerimenti di asset
 */

// Array per memorizzare la lista completa degli asset
let assetList = [];
// Array per memorizzare gli asset recenti cercati dall'utente
let recentAssets = [];
// Numero massimo di asset recenti da memorizzare
const MAX_RECENT_ASSETS = 5;
// Numero massimo di suggerimenti da mostrare
const MAX_SUGGESTIONS = 8;

/**
 * Inizializza il modulo di autocompletamento
 * @returns {Promise<void>} - Promise risolta quando l'inizializzazione è completata
 */
async function initializeAutocomplete() {
    try {
        // Carica gli asset dalla sorgente (CSV o locale)
        await loadAssets();
        
        // Imposta gli event listener per l'input di ricerca
        setupEventListeners();
        
        // Carica gli asset recenti dal localStorage se presenti
        loadRecentAssets();
        
        console.log("Modulo di autocompletamento inizializzato con successo");
    } catch (error) {
        console.error("Errore nell'inizializzazione dell'autocompletamento:", error);
    }
}

/**
 * Carica la lista degli asset dal file CSV o da una fonte dati interna
 * @returns {Promise<void>} - Promise risolta quando gli asset sono caricati
 */
async function loadAssets() {
    try {
        // In un ambiente di produzione, questo potrebbe essere un endpoint API
        const response = await fetch('assets.csv');
        
        if (!response.ok) {
            throw new Error(`Errore nel caricamento del file CSV: ${response.status}`);
        }
        
        const csvText = await response.text();
        assetList = parseCSV(csvText);
        
        console.log(`Caricati ${assetList.length} asset per l'autocompletamento`);
    } catch (error) {
        console.error("Impossibile caricare il file CSV degli asset:", error);
        
        // Fallback: Carica una lista predefinita di asset comuni
        assetList = [
            { symbol: "AAPL", name: "Apple Inc.", category: "STOCKS" },
            { symbol: "MSFT", name: "Microsoft Corporation", category: "STOCKS" },
            { symbol: "AMZN", name: "Amazon.com Inc.", category: "STOCKS" },
            { symbol: "EURUSD", name: "Euro/US Dollar", category: "FOREX" },
            { symbol: "BTC", name: "Bitcoin", category: "CRYPTO" },
            { symbol: "ETH", name: "Ethereum", category: "CRYPTO" },
            { symbol: "SPY", name: "SPDR S&P 500 ETF Trust", category: "ETF" },
            { symbol: "GC=F", name: "Gold", category: "COMMODITIES" }
        ];
        
        console.log("Utilizzando lista di asset predefinita di fallback");
    }
}

/**
 * Analizza il contenuto CSV e lo converte in un array di oggetti asset
 * @param {string} csvText - Testo CSV da analizzare
 * @returns {Array<Object>} - Array di oggetti asset
 */
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const result = [];
    
    // Salta l'intestazione
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const [symbol, name, category] = line.split(',');
        
        if (symbol && name) {
            result.push({
                symbol,
                name,
                category: category || "ALTRE"
            });
        }
    }
    
    return result;
}

/**
 * Configura gli event listener per l'input di ricerca
 */
function setupEventListeners() {
    const symbolInput = document.getElementById('symbol');
    const suggestionContainer = document.createElement('div');
    suggestionContainer.className = 'autocomplete-suggestions';
    suggestionContainer.style.display = 'none';
    
    // Inserisci il container dei suggerimenti dopo l'input
    symbolInput.parentNode.insertBefore(suggestionContainer, symbolInput.nextSibling);
    
    // Event listener per l'input
    symbolInput.addEventListener('input', function() {
        const query = this.value.trim().toUpperCase();
        
        if (query.length < 1) {
            suggestionContainer.style.display = 'none';
            return;
        }
        
        const suggestions = searchAssets(query);
        displaySuggestions(suggestions, query, suggestionContainer);
    });
    
    // Nascondi i suggerimenti quando si clicca al di fuori
    document.addEventListener('click', function(event) {
        if (!symbolInput.contains(event.target) && !suggestionContainer.contains(event.target)) {
            suggestionContainer.style.display = 'none';
        }
    });
    
    // Mostra suggerimenti recenti quando l'input ottiene il focus ed è vuoto
    symbolInput.addEventListener('focus', function() {
        if (this.value.trim() === '' && recentAssets.length > 0) {
            displaySuggestions(recentAssets, '', suggestionContainer, true);
        }
    });
    
    // Naviga tra i suggerimenti con le frecce e seleziona con Enter
    symbolInput.addEventListener('keydown', function(event) {
        if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(event.key) && 
            suggestionContainer.style.display !== 'none') {
            
            const suggestions = Array.from(suggestionContainer.querySelectorAll('.suggestion-item'));
            
            if (!suggestions.length) return;
            
            const activeIndex = suggestions.findIndex(item => item.classList.contains('active'));
            
            if (event.key === 'ArrowUp') {
                event.preventDefault(); // Previene lo spostamento del cursore
                const newIndex = activeIndex > 0 ? activeIndex - 1 : suggestions.length - 1;
                updateActiveSuggestion(suggestions, newIndex);
            } else if (event.key === 'ArrowDown') {
                event.preventDefault(); // Previene lo spostamento del cursore
                const newIndex = activeIndex < suggestions.length - 1 ? activeIndex + 1 : 0;
                updateActiveSuggestion(suggestions, newIndex);
            } else if (event.key === 'Enter' && activeIndex >= 0) {
                event.preventDefault();
                selectSuggestion(suggestions[activeIndex], symbolInput, suggestionContainer);
            } else if (event.key === 'Escape') {
                suggestionContainer.style.display = 'none';
            }
        }
    });
    
    console.log("Event listeners per l'autocompletamento configurati");
}

/**
 * Aggiorna il suggerimento attivo durante la navigazione con frecce
 * @param {NodeList} suggestions - Lista di elementi di suggerimento
 * @param {number} newIndex - Nuovo indice attivo
 */
function updateActiveSuggestion(suggestions, newIndex) {
    suggestions.forEach(item => item.classList.remove('active'));
    suggestions[newIndex].classList.add('active');
    suggestions[newIndex].scrollIntoView({ block: 'nearest' });
}

/**
 * Seleziona un suggerimento e compila l'input
 * @param {HTMLElement} suggestionEl - Elemento di suggerimento selezionato
 * @param {HTMLInputElement} input - Input di ricerca
 * @param {HTMLElement} container - Container dei suggerimenti
 */
function selectSuggestion(suggestionEl, input, container) {
    const symbol = suggestionEl.dataset.symbol;
    input.value = symbol;
    container.style.display = 'none';
    
    // Aggiungi agli asset recenti
    addToRecentAssets(symbol);
    
    // Avviso opzionale dell'asset selezionato
    console.log(`Asset selezionato: ${symbol}`);
    
    // Trigger di un evento custom per notificare che un asset è stato selezionato
    input.dispatchEvent(new CustomEvent('assetselected', { 
        detail: { symbol }
    }));
}

/**
 * Cerca asset corrispondenti alla query
 * @param {string} query - Query di ricerca
 * @returns {Array<Object>} - Array di asset corrispondenti
 */
function searchAssets(query) {
    // Ritorna i risultati più rilevanti in base alla corrispondenza
    return assetList
        .filter(asset => 
            asset.symbol.includes(query) || 
            asset.name.toUpperCase().includes(query))
        .sort((a, b) => {
            // Priorità agli asset che iniziano con la query
            const aStartsWithQuery = a.symbol.startsWith(query) ? -2 : 
                                    a.name.toUpperCase().startsWith(query) ? -1 : 0;
            const bStartsWithQuery = b.symbol.startsWith(query) ? -2 : 
                                    b.name.toUpperCase().startsWith(query) ? -1 : 0;
            
            return aStartsWithQuery - bStartsWithQuery || a.symbol.localeCompare(b.symbol);
        })
        .slice(0, MAX_SUGGESTIONS);
}

/**
 * Visualizza i suggerimenti nel container
 * @param {Array<Object>} suggestions - Suggerimenti da visualizzare
 * @param {string} query - Query di ricerca
 * @param {HTMLElement} container - Container dei suggerimenti
 * @param {boolean} isRecent - Indica se si tratta di asset recenti
 */
function displaySuggestions(suggestions, query, container, isRecent = false) {
    if (!suggestions.length) {
        container.style.display = 'none';
        return;
    }
    
    container.innerHTML = '';
    container.style.display = 'block';
    
    if (isRecent) {
        const recentHeader = document.createElement('div');
        recentHeader.className = 'suggestion-header';
        recentHeader.textContent = 'Asset recenti';
        container.appendChild(recentHeader);
    }
    
    // Raggruppa i suggerimenti per categoria
    const groupedSuggestions = {};
    suggestions.forEach(asset => {
        if (!groupedSuggestions[asset.category]) {
            groupedSuggestions[asset.category] = [];
        }
        groupedSuggestions[asset.category].push(asset);
    });
    
    // Crea elementi per ogni categoria
    Object.entries(groupedSuggestions).forEach(([category, assets]) => {
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.textContent = category;
        container.appendChild(categoryHeader);
        
        assets.forEach(asset => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.dataset.symbol = asset.symbol;
            
            // Evidenzia la parte corrispondente alla query
            let symbolHtml = asset.symbol;
            let nameHtml = asset.name;
            
            if (query && !isRecent) {
                const regExp = new RegExp(`(${query})`, 'gi');
                symbolHtml = asset.symbol.replace(regExp, '<strong>$1</strong>');
                nameHtml = asset.name.replace(regExp, '<strong>$1</strong>');
            }
            
            // Crea icona categoria
            const categoryIcon = getCategoryIcon(asset.category);
            
            item.innerHTML = `
                <span class="asset-category-icon">${categoryIcon}</span>
                <span class="asset-symbol">${symbolHtml}</span>
                <span class="asset-name">${nameHtml}</span>
            `;
            
            item.addEventListener('click', () => {
                const input = document.getElementById('symbol');
                selectSuggestion(item, input, container);
            });
            
            container.appendChild(item);
        });
    });
    
    // Attiva il primo suggerimento per la navigazione con tastiera
    const firstSuggestion = container.querySelector('.suggestion-item');
    if (firstSuggestion) firstSuggestion.classList.add('active');
}

/**
 * Restituisce l'icona appropriata per la categoria dell'asset
 * @param {string} category - Categoria dell'asset
 * @returns {string} - Emoji o icona per la categoria
 */
function getCategoryIcon(category) {
    switch (category.toUpperCase()) {
        case 'STOCKS':
            return '📈';
        case 'FOREX':
            return '💱';
        case 'CRYPTO':
            return '🔶';
        case 'ETF':
            return '📊';
        case 'INDEX':
        case 'INDICES':
            return '📉';
        case 'COMMODITIES':
            return '🏆';
        default:
            return '🔍';
    }
}

/**
 * Aggiunge un asset alla lista degli asset recenti
 * @param {string} symbol - Simbolo dell'asset da aggiungere
 */
function addToRecentAssets(symbol) {
    // Trova i dettagli completi dell'asset
    const asset = assetList.find(a => a.symbol === symbol);
    
    if (!asset) return;
    
    // Rimuovi se già presente
    recentAssets = recentAssets.filter(a => a.symbol !== symbol);
    
    // Aggiungi all'inizio dell'array
    recentAssets.unshift(asset);
    
    // Limita la lunghezza
    if (recentAssets.length > MAX_RECENT_ASSETS) {
        recentAssets = recentAssets.slice(0, MAX_RECENT_ASSETS);
    }
    
    // Salva nel localStorage
    saveRecentAssets();
}

/**
 * Salva gli asset recenti nel localStorage
 */
function saveRecentAssets() {
    try {
        localStorage.setItem('recentAssets', JSON.stringify(recentAssets));
    } catch (error) {
        console.error("Errore nel salvataggio degli asset recenti:", error);
    }
}

/**
 * Carica gli asset recenti dal localStorage
 */
function loadRecentAssets() {
    try {
        const saved = localStorage.getItem('recentAssets');
        if (saved) {
            recentAssets = JSON.parse(saved);
        }
    } catch (error) {
        console.error("Errore nel caricamento degli asset recenti:", error);
        recentAssets = [];
    }
}

/**
 * Restituisce la lista completa degli asset
 * @returns {Array<Object>} - Lista degli asset
 */
function getAssetList() {
    return [...assetList];
}

/**
 * Ottiene i dettagli completi di un asset dal suo simbolo
 * @param {string} symbol - Simbolo dell'asset
 * @returns {Object|null} - Dettagli dell'asset o null se non trovato
 */
function getAssetDetails(symbol) {
    return assetList.find(asset => asset.symbol === symbol) || null;
}

// Esporta le funzioni pubbliche
export {
    initializeAutocomplete,
    getAssetList,
    getAssetDetails
};
