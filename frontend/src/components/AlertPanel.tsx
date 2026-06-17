import { useTopologyStore } from '../store';
import { LowVoltageAlert } from '../types';

export default function AlertPanel() {
  const lowVoltageAlerts = useTopologyStore((state) => state.lowVoltageAlerts);
  const clearAlerts = useTopologyStore((state) => state.clearAlerts);
  const voltageMap = useTopologyStore((state) => state.voltageMap);
  const topologyNodes = useTopologyStore((state) => state.topologyNodes);

  if (lowVoltageAlerts.length === 0) {
    return (
      <div className="alert-panel">
        <div className="alert-header">
          <h4>⚡ 实时告警</h4>
          <span className="alert-count ok">正常</span>
        </div>
        <div className="alert-empty">
          <div className="alert-empty-icon">✓</div>
          <div className="alert-empty-title">全网电压正常</div>
          <div className="alert-empty-desc">未检测到电压跌落超过 5% 的节点</div>
        </div>
      </div>
    );
  }

  const getSeverity = (drop: number): { label: string; color: string } => {
    if (drop >= 15) return { label: '危急', color: '#b91c1c' };
    if (drop >= 10) return { label: '严重', color: '#dc2626' };
    if (drop >= 7) return { label: '较重', color: '#ea580c' };
    return { label: '一般', color: '#f59e0b' };
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('zh-CN', { hour12: false });
  };

  return (
    <div className="alert-panel">
      <div className="alert-header">
        <h4>⚡ 实时告警</h4>
        <span className="alert-count alert">
          {lowVoltageAlerts.length} 条告警
        </span>
        {lowVoltageAlerts.length > 0 && (
          <button className="clear-btn" onClick={clearAlerts}>
            清除
          </button>
        )}
      </div>

      <div className="alert-list">
        {lowVoltageAlerts.map((alert: LowVoltageAlert) => {
          const severity = getSeverity(alert.dropPercentage);
          const node = topologyNodes.find((n) => n.id === alert.nodeId);
          const baseVoltage = node?.baseVoltage || alert.baseVoltage || 10;
          return (
            <div key={alert.nodeId} className="alert-item" style={{ borderLeftColor: severity.color }}>
              <div className="alert-item-header">
                <span className="alert-name" title={alert.nodeId}>
                  {alert.nodeName || alert.nodeId}
                </span>
                <span className="alert-severity" style={{ background: severity.color }}>
                  {severity.label}
                </span>
              </div>
              <div className="alert-item-body">
                <div className="alert-info">
                  <span className="alert-label">当前电压:</span>
                  <span className="alert-value danger">{alert.voltageMagnitude.toFixed(3)} kV</span>
                </div>
                <div className="alert-info">
                  <span className="alert-label">额定电压:</span>
                  <span className="alert-value">{baseVoltage.toFixed(2)} kV</span>
                </div>
                <div className="alert-info">
                  <span className="alert-label">跌落幅度:</span>
                  <span className="alert-value danger">-{alert.dropPercentage.toFixed(1)}%</span>
                </div>
                <div className="alert-time">
                  发生时间: {formatTime(alert.timestamp)}
                  {' · '}
                  负荷: {alert.realLoad.toFixed(1)} MW / {alert.reactiveLoad.toFixed(1)} MVAr
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
