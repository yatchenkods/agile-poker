import { config } from '../config.ts';

/**
 * WebSocket connection management
 * Supports runtime configuration of WebSocket URL
 */

class WebSocketManager {
  constructor() {
    this.ws = null;
    this.url = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // 1 second
    this.messageHandlers = {};
    this.connectionHandlers = [];
    this.disconnectionHandlers = [];
  }

  /**
   * Get the WebSocket URL from runtime configuration
   */
  getWsUrl() {
    const wsUrl = config.wsUrl;
    
    if (!wsUrl) {
      console.error('[WebSocket] No WebSocket URL configured');
      return null;
    }

    // Ensure URL protocol is correct
    let url = wsUrl;
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      console.warn('[WebSocket] WebSocket URL should start with ws:// or wss://, got:', url);
    }

    if (config.logLevel === 'debug' || config.logLevel === 'trace') {
      console.log('[WebSocket] Using WebSocket URL:', url);
    }

    return url;
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    const wsUrl = this.getWsUrl();
    
    if (!wsUrl) {
      console.error('[WebSocket] Cannot connect: no WebSocket URL configured');
      return Promise.reject(new Error('WebSocket URL not configured'));
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(wsUrl);
        this.url = wsUrl;

        this.ws.onopen = () => {
          if (config.logLevel === 'debug' || config.logLevel === 'trace') {
            console.log('[WebSocket] Connected to:', wsUrl);
          }
          this.reconnectAttempts = 0;
          this.connectionHandlers.forEach(handler => handler());
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            const { type, payload } = data;
            
            if (type && this.messageHandlers[type]) {
              this.messageHandlers[type].forEach(handler => handler(payload));
            }
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          if (config.logLevel === 'debug' || config.logLevel === 'trace') {
            console.log('[WebSocket] Disconnected from:', wsUrl);
          }
          this.disconnectionHandlers.forEach(handler => handler());
          this.attemptReconnect();
        };
      } catch (error) {
        console.error('[WebSocket] Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      if (config.logLevel === 'debug' || config.logLevel === 'trace') {
        console.log(`[WebSocket] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
      }
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('[WebSocket] Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('[WebSocket] Max reconnection attempts reached');
    }
  }

  /**
   * Send message through WebSocket
   */
  send(type, payload = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[WebSocket] WebSocket is not connected');
      return false;
    }

    try {
      const message = JSON.stringify({ type, payload });
      this.ws.send(message);
      return true;
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
      return false;
    }
  }

  /**
   * Register handler for specific message type
   */
  on(type, handler) {
    if (!this.messageHandlers[type]) {
      this.messageHandlers[type] = [];
    }
    this.messageHandlers[type].push(handler);
  }

  /**
   * Unregister handler for specific message type
   */
  off(type, handler) {
    if (this.messageHandlers[type]) {
      this.messageHandlers[type] = this.messageHandlers[type].filter(h => h !== handler);
    }
  }

  /**
   * Register handler for connection event
   */
  onConnect(handler) {
    this.connectionHandlers.push(handler);
  }

  /**
   * Register handler for disconnection event
   */
  onDisconnect(handler) {
    this.disconnectionHandlers.push(handler);
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Export singleton instance
export const wsManager = new WebSocketManager();

export default wsManager;
