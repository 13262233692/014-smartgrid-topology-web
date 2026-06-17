import axios from 'axios';
import { EquipmentNode, ParsedCimData, TopologyResult } from './types';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

export const topologyApi = {
  importCim: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<ParsedCimData>('/topology/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  generateDemo: async () => {
    const res = await api.post<ParsedCimData>('/topology/demo');
    return res.data;
  },

  getSubstations: async () => {
    const res = await api.get<EquipmentNode[]>('/topology/substations');
    return res.data;
  },

  getEquipment: async (id: string) => {
    const res = await api.get<EquipmentNode>(`/topology/equipment/${id}`);
    return res.data;
  },

  getDownstream: async (substationId: string, depth: number = 6) => {
    const res = await api.get<TopologyResult>(`/topology/downstream/${substationId}`, {
      params: { depth },
    });
    return res.data;
  },

  getStats: async () => {
    const res = await api.get<{
      totalNodes: number;
      totalEdges: number;
      byType: Record<string, number>;
    }>('/topology/stats');
    return res.data;
  },

  toggleBreaker: async (id: string, open: boolean) => {
    const res = await api.post<EquipmentNode>(`/topology/toggle-breaker/${id}`, { open });
    return res.data;
  },
};
