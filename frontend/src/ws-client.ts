import { io, Socket } from 'socket.io-client';
import { LowVoltageAlert, ScadaDataPoint, VoltageUpdate, PowerFlowStatus } from './types';

type AlertListener = (alerts: LowVoltageAlert[]) => void;
type VoltageListener = (updates: VoltageUpdate[]) => void;
type ScadaListener = (data: ScadaDataPoint[]) => void;
type PowerFlowListener = (status: PowerFlowStatus) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private alertListeners = new Set<AlertListener>();
  private voltageListeners = new Set<VoltageListener>();
  private scadaListeners = new Set<ScadaListener>();
  private powerFlowListeners = new Set<PowerFlowListener>();
  private connected = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  connect(): void {
    if (this.connected && this.socket?.connected) return;

    try {
      const url = window.location.hostname === 'localhost'
        ? `http://localhost:3001`
        : '';

      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      this.socket.on('connect', () => {
        console.log('[WS] Connected to power-flow gateway');
        this.connected = true;
      });

      this.socket.on('disconnect', () => {
        console.log('[WS] Disconnected');
        this.connected = false;
      });

      this.socket.on('lowVoltageAlerts', (alerts: LowVoltageAlert[]) => {
        this.alertListeners.forEach(l => l(alerts));
      });

      this.socket.on('voltageUpdates', (updates: VoltageUpdate[]) => {
        this.voltageListeners.forEach(l => l(updates));
      });

      this.socket.on('scadaData', (data: ScadaDataPoint[]) => {
        this.scadaListeners.forEach(l => l(data));
      });

      this.socket.on('powerFlowResult', (status: PowerFlowStatus) => {
        this.powerFlowListeners.forEach(l => l(status));
      });
    } catch (e) {
      console.warn('[WS] Connection failed:', e);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected && this.socket?.connected === true;
  }

  onAlerts(listener: AlertListener): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }

  onVoltageUpdates(listener: VoltageListener): () => void {
    this.voltageListeners.add(listener);
    return () => this.voltageListeners.delete(listener);
  }

  onScadaData(listener: ScadaListener): () => void {
    this.scadaListeners.add(listener);
    return () => this.scadaListeners.delete(listener);
  }

  onPowerFlowResult(listener: PowerFlowListener): () => void {
    this.powerFlowListeners.add(listener);
    return () => this.powerFlowListeners.delete(listener);
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }
}

export const wsClient = new WebSocketClient();
