import { useEffect } from 'react';
import { useTopologyStore } from './store';
import Sidebar from './components/Sidebar';
import TopologyCanvas from './components/TopologyCanvas';
import PropertyPanel from './components/PropertyPanel';

export default function App() {
  const loadSubstations = useTopologyStore((s) => s.loadSubstations);
  const loadStats = useTopologyStore((s) => s.loadStats);
  const generateDemo = useTopologyStore((s) => s.generateDemo);
  const importCim = useTopologyStore((s) => s.importCim);
  const topologyNodes = useTopologyStore((s) => s.topologyNodes);
  const topologyEdges = useTopologyStore((s) => s.topologyEdges);
  const selectedNode = useTopologyStore((s) => s.selectedNode);
  const selectNode = useTopologyStore((s) => s.selectNode);
  const selectedSubstation = useTopologyStore((s) => s.selectedSubstation);

  useEffect(() => {
    const init = async () => {
      await loadSubstations();
      await loadStats();
      const ss = useTopologyStore.getState().substations;
      if (ss.length === 0) {
        await generateDemo();
      }
    };
    init();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [loadStats]);

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="logo">
          <span className="logo-icon">⚡</span>
          <span>市级电网拓扑分析平台</span>
        </div>
        <div style={{ fontSize: 13, color: '#64748b' }}>
          IEC 61970 CIM · Neo4j · G6 DAG 可视化
        </div>
        <div className="header-actions">
          {selectedSubstation && (
            <div
              style={{
                fontSize: 13,
                color: '#38bdf8',
                padding: '6px 14px',
                background: 'rgba(14,165,233,0.1)',
                borderRadius: 6,
              }}
            >
              当前: {selectedSubstation.name}
            </div>
          )}
        </div>
      </header>

      <div className="app-body">
        <Sidebar onImport={importCim} />
        <TopologyCanvas
          nodes={topologyNodes}
          edges={topologyEdges}
          onNodeClick={selectNode}
          selectedNodeId={selectedNode?.id}
        />
        <PropertyPanel node={selectedNode} onClose={() => selectNode(null)} />
      </div>
    </div>
  );
}
