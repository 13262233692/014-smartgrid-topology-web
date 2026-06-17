import { useTopologyStore } from '../store';
import { EquipmentNode } from '../types';
import { getTypeColor } from '../graph/topology-graph';

interface Props {
  node: EquipmentNode | null;
  onClose: () => void;
}

export default function PropertyPanel({ node, onClose }: Props) {
  const toggleBreaker = useTopologyStore((s) => s.toggleBreaker);

  if (!node) return null;

  const isBreaker = node.type === 'Breaker';
  const isOpen = node.open;

  const getTypeName = (type: string) => {
    const map: Record<string, string> = {
      Substation: '变电站',
      BusbarSection: '母线',
      Breaker: '断路器',
      PowerTransformer: '主变压器',
      TransformerWinding: '变压器绕组',
      Feeder: '馈线',
      ConnectivityNode: '连接节点',
      Terminal: '端子',
      EnergyConsumer: '电力用户',
      EnergySource: '电源',
    };
    return map[type] || type;
  };

  return (
    <div className="property-panel">
      <h3>
        <span style={{ color: getTypeColor(node.type as any) }}>●</span>
        <span style={{ marginLeft: 8 }}>{node.name}</span>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </h3>

      <div className="property-row">
        <span className="label">设备类型</span>
        <span className="value">{getTypeName(node.type)}</span>
      </div>
      <div className="property-row">
        <span className="label">设备 ID</span>
        <span className="value" style={{ fontSize: 11 }}>{node.id}</span>
      </div>
      <div className="property-row">
        <span className="label">运行状态</span>
        <span className={`value ${node.energized === false ? 'de-energized' : 'energized'}`}>
          <span className={`status-tag ${node.energized === false ? 'off' : 'on'}`}>
            {node.energized === false ? '断电' : '带电'}
          </span>
        </span>
      </div>
      {node.baseVoltage && (
        <div className="property-row">
          <span className="label">电压等级</span>
          <span className="value">{node.baseVoltage} kV</span>
        </div>
      )}
      {node.ratedKV && (
        <div className="property-row">
          <span className="label">额定电压</span>
          <span className="value">{node.ratedKV} kV</span>
        </div>
      )}
      {node.powerRating && (
        <div className="property-row">
          <span className="label">额定容量</span>
          <span className="value">{node.powerRating} MVA</span>
        </div>
      )}
      {node.p !== undefined && (
        <div className="property-row">
          <span className="label">有功功率</span>
          <span className="value">{node.p.toFixed(2)} MW</span>
        </div>
      )}
      {node.q !== undefined && (
        <div className="property-row">
          <span className="label">无功功率</span>
          <span className="value">{node.q.toFixed(2)} MVar</span>
        </div>
      )}
      {isBreaker && (
        <div className="property-row">
          <span className="label">开关状态</span>
          <span className="value">
            <span className={`status-tag ${isOpen ? 'open' : 'closed'}`}>
              {isOpen ? '分闸' : '合闸'}
            </span>
          </span>
        </div>
      )}
      {node.sequenceNumber && (
        <div className="property-row">
          <span className="label">绕组序号</span>
          <span className="value">#{node.sequenceNumber}</span>
        </div>
      )}
      {node.substationId && (
        <div className="property-row">
          <span className="label">所属变电站</span>
          <span className="value" style={{ fontSize: 11 }}>{node.substationId}</span>
        </div>
      )}
      {node.feederId && (
        <div className="property-row">
          <span className="label">所属馈线</span>
          <span className="value" style={{ fontSize: 11 }}>{node.feederId}</span>
        </div>
      )}
      {node.description && (
        <div className="property-row">
          <span className="label">描述</span>
          <span className="value">{node.description}</span>
        </div>
      )}

      {isBreaker && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #334155' }}>
          <div className="property-row" style={{ border: 'none', padding: 0 }}>
            <span className="label">操作开关</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={!isOpen}
                onChange={(e) => toggleBreaker(node.id, !e.target.checked)}
              />
              <span className="toggle-slider" />
            </label>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
            切换断路器分/合闸状态
          </div>
        </div>
      )}
    </div>
  );
}
