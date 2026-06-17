import { create } from 'zustand';
import { EquipmentNode, ConnectionEdge, TopologyResult } from './types';
import { topologyApi } from './api';

interface TopologyState {
  substations: EquipmentNode[];
  selectedSubstation: EquipmentNode | null;
  topologyNodes: EquipmentNode[];
  topologyEdges: ConnectionEdge[];
  selectedNode: EquipmentNode | null;
  stats: { totalNodes: number; totalEdges: number; byType: Record<string, number> };
  loading: boolean;
  error: string | null;

  loadSubstations: () => Promise<void>;
  loadStats: () => Promise<void>;
  selectSubstation: (ss: EquipmentNode | null) => Promise<void>;
  selectNode: (node: EquipmentNode | null) => void;
  generateDemo: () => Promise<void>;
  importCim: (file: File) => Promise<void>;
  toggleBreaker: (id: string, open: boolean) => Promise<void>;
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
}));
