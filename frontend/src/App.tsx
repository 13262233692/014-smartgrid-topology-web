import { useEffect, useState } from 'react';
import { useTopologyStore } from './store';
import Sidebar from './components/Sidebar';
import TopologyCanvas from './components/TopologyCanvas';
import PropertyPanel from './components/PropertyPanel';
import AlertPanel from './components/AlertPanel';

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
  const startWs = useTopologyStore((s) => s.startWs);
  const stopWs = useTopologyStore((s) => s.stopWs);
  const wsConnected = useTopologyStore((s) => s.wsConnected);
  const simRunning = useTopologyStore((s) => s.simRunning);
  const lowVoltageAlerts = useTopologyStore((s) => s.lowVoltageAlerts);
  const powerFlowStatus = useTopologyStore((s) => s.powerFlowStatus);

  const [rightPanel, setRightPanel] = useState<'alerts' | 'properties'>('alerts');

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
    startWs();
    return () => stopWs();
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
        <div className="header-stats">
          <div className={`status-dot ${wsConnected ? 'connected' : 'disconnected'}`}></div>
          <span className="status-text">
            {wsConnected ? 'WebSocket 已连接' : 'WebSocket 断开'}
          </span>
          {simRunning && (
            <>
              <div className="status-dot simulating"></div>
              <span className="status-text sim">SCADA 模拟中</span>
            </>
          )}
          {powerFlowStatus && (
            <span className="status-text" style={{ marginLeft: 12 }}>
              潮流计算: {powerFlowStatus.converged ? '✓ 收敛' : '✗ 发散'} · {powerFlowStatus.iterations} 次迭代
            </span>
          )}
        </div>
        <div className="header-actions">
          {lowVoltageAlerts.length > 0 && (
            <div
              style={{
                fontSize: 13,
                color: '#ef4444',
                padding: '6px 14px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 6,
                fontWeight: 600,
              }}
            >
              ⚠ {lowVoltageAlerts.length} 个低压告警
            </div>
          )}
          {selectedSubstation && (
            <div
              style={{
                fontSize: 13,
                color: '#38bdf8',
                padding: '6px 14px',
                background: 'rgba(14,165,233,0.1)',
                borderRadius: 6,
                marginLeft: 8,
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
        <div className="right-panel">
          <div className="right-panel-tabs">
            <button
              className={rightPanel === 'alerts' ? 'active' : ''}
              onClick={() => setRightPanel('alerts')}
            >
              实时告警
              {lowVoltageAlerts.length > 0 && (
                <span className="tab-badge">{lowVoltageAlerts.length}</span>
              )}
            </button>
            <button
              className={rightPanel === 'properties' ? 'active' : ''}
              onClick={() => setRightPanel('properties')}
            >
              设备属性
            </button>
          </div>
          <div className="right-panel-content">
            {rightPanel === 'alerts' ? (
              <AlertPanel />
            ) : (
              <PropertyPanel node={selectedNode} onClose={() => selectNode(null)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
