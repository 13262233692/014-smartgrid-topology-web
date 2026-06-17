import { useState } from 'react';
import { useTopologyStore } from '../store';

interface Props {
  onImport: (file: File) => void;
}

export default function Sidebar({ onImport }: Props) {
  const substations = useTopologyStore((s) => s.substations);
  const selectedSubstation = useTopologyStore((s) => s.selectedSubstation);
  const stats = useTopologyStore((s) => s.stats);
  const selectSubstation = useTopologyStore((s) => s.selectSubstation);
  const generateDemo = useTopologyStore((s) => s.generateDemo);
  const loading = useTopologyStore((s) => s.loading);
  const simRunning = useTopologyStore((s) => s.simRunning);
  const startSimulation = useTopologyStore((s) => s.startSimulation);
  const stopSimulation = useTopologyStore((s) => s.stopSimulation);
  const setLoadMultiplier = useTopologyStore((s) => s.setLoadMultiplier);
  const [loadMultiplier, setLocalMultiplier] = useState(1.0);
  const [simInterval, setSimInterval] = useState(5000);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImport(file);
    e.target.value = '';
  };

  const getTypeName = (type: string) => {
    const map: Record<string, string> = {
      Substation: '变电站',
      BusbarSection: '母线',
      Breaker: '断路器',
      PowerTransformer: '主变',
      TransformerWinding: '绕组',
      Feeder: '馈线',
      ConnectivityNode: '节点',
      Terminal: '端子',
      EnergyConsumer: '用户',
      EnergySource: '电源',
    };
    return map[type] || type;
  };

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <h3>数据管理</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={generateDemo} disabled={loading}>
            {loading ? '加载中...' : '生成演示'}
          </button>
          <label className="btn">
            导入CIM
            <input
              type="file"
              accept=".xml,.rdf,.cim"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </label>
        </div>
      </div>

      <div className="sidebar-section">
        <h3>潮流模拟控制</h3>
        <div className="sim-controls">
          <div className="sim-row">
            <label className="sim-label">模拟间隔</label>
            <select
              className="sim-select"
              value={simInterval}
              onChange={(e) => setSimInterval(Number(e.target.value))}
              disabled={simRunning}
            >
              <option value={2000}>2 秒</option>
              <option value={5000}>5 秒</option>
              <option value={10000}>10 秒</option>
            </select>
          </div>
          <div className="sim-row">
            <label className="sim-label">负荷倍数</label>
            <div className="sim-slider-wrap">
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={loadMultiplier}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setLocalMultiplier(val);
                  setLoadMultiplier(val);
                }}
                className="sim-slider"
              />
              <span className="sim-value">{loadMultiplier.toFixed(1)}x</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {!simRunning ? (
              <button
                className="btn btn-primary"
                onClick={() => startSimulation(simInterval)}
                disabled={loading}
                style={{ flex: 1 }}
              >
                ▶ 开始SCADA模拟
              </button>
            ) : (
              <button
                className="btn btn-danger"
                onClick={stopSimulation}
                style={{ flex: 1 }}
              >
                ■ 停止模拟
              </button>
            )}
          </div>
          {simRunning && (
            <div className="sim-status active">
              <div className="sim-pulse"></div>
              <span>SCADA 数据流实时注入中 · 每 {simInterval / 1000}s 推送</span>
            </div>
          )}
        </div>
      </div>

      <div className="sidebar-section">
        <h3>数据统计</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalNodes}</div>
            <div className="stat-label">设备节点</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalEdges}</div>
            <div className="stat-label">连接关系</div>
          </div>
        </div>
        {Object.keys(stats.byType).length > 0 && (
          <div style={{ marginTop: 10 }}>
            {Object.entries(stats.byType)
              .filter(([, v]) => v > 0)
              .map(([type, count]) => (
                <div
                  key={type}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: '#64748b',
                    padding: '3px 0',
                  }}
                >
                  <span>{getTypeName(type)}</span>
                  <span style={{ color: '#94a3b8' }}>{count}</span>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="sidebar-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, borderBottom: 'none' }}>
        <div style={{ padding: '16px 16px 0 16px' }}>
          <h3>变电站列表</h3>
        </div>
        <div className="substation-list">
          {substations.length === 0 && (
            <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>
              暂无数据，请先生成演示或导入CIM
            </div>
          )}
          {substations.map((ss) => (
            <div
              key={ss.id}
              className={`substation-item ${selectedSubstation?.id === ss.id ? 'active' : ''}`}
              onClick={() => selectSubstation(ss)}
            >
              <div className="ss-name">{ss.name}</div>
              <div className="ss-voltage">
                {ss.baseVoltage ? `${ss.baseVoltage} kV` : ''}
                {ss.id}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
