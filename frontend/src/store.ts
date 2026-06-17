import { create } from 'zustand';
import { EquipmentNode, ConnectionEdge, TopologyResult, LowVoltageAlert, VoltageUpdate, PowerFlowStatus } from './types';
import { topologyApi, powerFlowApi } from './api';
import { wsClient } from './ws-client';

interface TopologyState {
  substations: EquipmentNode[];
  selectedSubstation: EquipmentNode | null;
  topologyNodes: EquipmentNode[];
  topologyEdges: ConnectionEdge[];
  selectedNode: EquipmentNode | null;
  stats: { totalNodes: number; totalEdges: number; byType: Record<string, number> };
  loading: boolean;
  error: string | null;

  lowVoltageAlerts: LowVoltageAlert[];
  voltageMap: Map<string, number>;
  powerFlowStatus: PowerFlowStatus | null;
  simRunning: boolean;
  wsConnected: boolean;

  loadSubstations: () => Promise<void>;
  loadStats: () => Promise<void>;
  selectSubstation: (ss: EquipmentNode | null) => Promise<void>;
  selectNode: (node: EquipmentNode | null) => void;
  generateDemo: () => Promise<void>;
  importCim: (file: File) => Promise<void>;
  toggleBreaker: (id: string, open: boolean) => Promise<void>;

  startWs: () => void;
  stopWs: () => void;
  startSimulation: (intervalMs?: number) => Promise<void>;
  stopSimulation: () => Promise<void>;
  setLoadMultiplier: (multiplier: number) => Promise<void>;
  clearAlerts: () => void;
}

export const useTopologyStore = create<TopologyState>((set, get) => ({
  substations: [],
  selectedSubstation: null,
  topologyNodes: [],
  topologyEdges: [],
  selectedNode: null,
  stats: { totalNodes: 0, totalEdges: 0, byType: {} },
  loading: false,
  error: null,

  lowVoltageAlerts: [],
  voltageMap: new Map(),
  powerFlowStatus: null,
  simRunning: false,
  wsConnected: false,

  loadSubstations: async () => {
    try {
      const data = await topologyApi.getSubstations();
      set({ substations: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  loadStats: async () => {
    try {
      const data = await topologyApi.getStats();
      set({ stats: data });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  selectSubstation: async (ss) => {
    if (!ss) {
      set({ selectedSubstation: null, topologyNodes: [], topologyEdges: [], selectedNode: null });
      return;
    }
    try {
      set({ loading: true, selectedSubstation: ss, selectedNode: null });
      const result: TopologyResult = await topologyApi.getDownstream(ss.id, 6);
      set({
        topologyNodes: result.nodes,
        topologyEdges: result.edges,
        loading: false,
      });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  selectNode: (node) => {
    set({ selectedNode: node });
  },

  generateDemo: async () => {
    try {
      set({ loading: true });
      await topologyApi.generateDemo();
      await get().loadSubstations();
      await get().loadStats();
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  importCim: async (file) => {
    try {
      set({ loading: true });
      await topologyApi.importCim(file);
      await get().loadSubstations();
      await get().loadStats();
      set({ loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  toggleBreaker: async (id, open) => {
    try {
      const updated = await topologyApi.toggleBreaker(id, open);
      if (updated) {
        set((state) => ({
          topologyNodes: state.topologyNodes.map((n) =>
            n.id === id ? { ...n, ...updated } : n
          ),
          selectedNode: state.selectedNode?.id === id ? { ...state.selectedNode, ...updated } : state.selectedNode,
        }));
      }
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  startWs: () => {
    wsClient.connect();
    set({ wsConnected: true });

    wsClient.onAlerts((alerts) => {
      set({ lowVoltageAlerts: alerts });
    });

    wsClient.onVoltageUpdates((updates) => {
      set((state) => {
        const newMap = new Map(state.voltageMap);
        for (const u of updates) {
          newMap.set(u.nodeId, u.voltage);
        }
        return { voltageMap: newMap };
      });
    });

    wsClient.onPowerFlowResult((status) => {
      set({ powerFlowStatus: status });
    });
  },

  stopWs: () => {
    wsClient.disconnect();
    set({ wsConnected: false });
  },

  startSimulation: async (intervalMs = 5000) => {
    try {
      set({ loading: true });
      await powerFlowApi.startSimulation(intervalMs);
      set({ simRunning: true, loading: false });
    } catch (e: any) {
      set({ error: e.message, loading: false });
    }
  },

  stopSimulation: async () => {
    try {
      await powerFlowApi.stopSimulation();
      set({ simRunning: false });
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  setLoadMultiplier: async (multiplier) => {
    try {
      await powerFlowApi.setLoadMultiplier(multiplier);
    } catch (e: any) {
      set({ error: e.message });
    }
  },

  clearAlerts: () => {
    set({ lowVoltageAlerts: [] });
  },
}));
