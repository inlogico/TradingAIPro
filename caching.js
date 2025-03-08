/**
 * Sistema di cache avanzato per TradingAI Pro
 * Supporta time-to-live (TTL) per invalidazione automatica
 */

import { CACHE_TTL } from './config.js';
import Logger from './advanced-logger.js';

class APICache {
    constructor(ttl = CACHE_TTL) {
        this.cache = new Map();
        this.ttl = ttl * 1000; // Converte secondi in millisecondi
        this.logger = Logger;
        this.maxSize = 100; // Numero massimo di elementi in cache
        
        this.logger.debug(`Inizializzato sistema di cache con TTL di ${ttl} secondi`);
        
        // Avvia pulizia periodica della cache
        this.setupCacheCleanup();
    }
    
    set(key, value) {
        // Se la cache raggiunge la dimensione massima, rimuovi gli elementi meno recenti
        if (this.cache.size >= this.maxSize) {
            this.pruneCache();
        }
        
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
            lastAccessed: Date.now() // Aggiungi timestamp di ultimo accesso
        });
        this.logger.debug(`Cache: impostato valore per chiave "${key}"`);
    }
    
    get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
            this.logger.debug(`Cache: miss per chiave "${key}"`);
            return null;
        }
        
        const now = Date.now();
        const age = now - item.timestamp;
        
        if (age > this.ttl) {
            this.logger.debug(`Cache: chiave "${key}" scaduta (età: ${age}ms, TTL: ${this.ttl}ms)`);
            this.cache.delete(key);
            return null;
        }
        
        // Aggiorna il timestamp di ultimo accesso
        item.lastAccessed = now;
        
        this.logger.debug(`Cache: hit per chiave "${key}" (età: ${age}ms)`);
        return item.value;
    }
    
    delete(key) {
        const result = this.cache.delete(key);
        this.logger.debug(`Cache: eliminata chiave "${key}": ${result ? 'successo' : 'chiave non trovata'}`);
        return result;
    }
    
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.logger.debug(`Cache: pulite ${size} chiavi`);
    }
    
    /**
     * Elimina elementi dalla cache quando supera la dimensione massima
     * Elimina gli elementi meno recentemente utilizzati (LRU)
     */
    pruneCache() {
        if (this.cache.size <= this.maxSize * 0.8) return; // Elimina solo quando supera l'80% della capacità
        
        const entries = [...this.cache.entries()];
        
        // Ordina per timestamp di ultimo accesso (dal meno recente al più recente)
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        
        // Elimina il 20% degli elementi meno recentemente utilizzati
        const deleteCount = Math.ceil(this.cache.size * 0.2);
        
        for (let i = 0; i < deleteCount && i < entries.length; i++) {
            this.cache.delete(entries[i][0]);
        }
        
        this.logger.debug(`Cache: eliminati ${deleteCount} elementi meno recenti (LRU cleanup)`);
    }
    
    setupCacheCleanup() {
        // Pulisce la cache ogni TTL/2 millisecondi
        const cleanupInterval = Math.max(this.ttl / 2, 60000); // Almeno 1 minuto
        
        setInterval(() => {
            this.logger.debug('Cache: avviata pulizia periodica');
            const now = Date.now();
            let expiredCount = 0;
            
            for (const [key, item] of this.cache.entries()) {
                if (now - item.timestamp > this.ttl) {
                    this.cache.delete(key);
                    expiredCount++;
                }
            }
            
            this.logger.debug(`Cache: pulizia completata, ${expiredCount} chiavi scadute rimosse`);
        }, cleanupInterval);
    }
    
    /**
     * Imposta la dimensione massima della cache
     * @param {number} size - Numero massimo di elementi in cache
     */
    setMaxSize(size) {
        if (typeof size !== 'number' || size <= 0) {
            this.logger.warn(`Cache: dimensione massima non valida: ${size}`);
            return;
        }
        
        this.maxSize = size;
        this.logger.debug(`Cache: dimensione massima impostata a ${size} elementi`);
        
        // Se la nuova dimensione è inferiore a quella attuale, esegui subito una pulizia
        if (this.cache.size > this.maxSize) {
            this.pruneCache();
        }
    }
}

// Esporta un'istanza predefinita configurata dal file config.js
export default new APICache(CACHE_TTL);
