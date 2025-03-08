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
        
        this.logger.debug(`Inizializzato sistema di cache con TTL di ${ttl} secondi`);
        
        // Avvia pulizia periodica della cache
        this.setupCacheCleanup();
    }
    
    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
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
}

// Esporta un'istanza predefinita configurata dal file config.js
export default new APICache(CACHE_TTL);
