import G6, { Graph, NodeConfig, EdgeConfig, LayoutConfig, INode } from '@antv/g6';
import { EquipmentNode, ConnectionEdge, EquipmentType, LowVoltageAlert } from '../types';

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  if (hex.startsWith('rgb')) {
    const m = hex.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  }
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

const LOW_VOLTAGE_COLOR = '#ef4444';
const LOW_VOLTAGE_PULSE_COLOR = '#fca5a5';

const alertAnimations = new Map<string, { shapes: any[]; active: boolean }>();

const TYPE_COLORS: Record<EquipmentType, string> = {
  [EquipmentType.ENERGY_SOURCE]: '#fbbf24',
  [EquipmentType.SUBSTATION]: '#0ea5e9',
  [EquipmentType.POWER_TRANSFORMER]: '#8b5cf6',
  [EquipmentType.TRANSFORMER_WINDING]: '#a78bfa',
  [EquipmentType.BUSBAR_SECTION]: '#22c55e',
  [EquipmentType.BREAKER]: '#f97316',
  [EquipmentType.FEEDER]: '#06b6d4',
  [EquipmentType.CONNECTIVITY_NODE]: '#64748b',
  [EquipmentType.TERMINAL]: '#475569',
  [EquipmentType.ENERGY_CONSUMER]: '#ec4899',
};

const TYPE_ICONS: Record<EquipmentType, string> = {
  [EquipmentType.ENERGY_SOURCE]: '⚡',
  [EquipmentType.SUBSTATION]: '🏭',
  [EquipmentType.POWER_TRANSFORMER]: '🔌',
  [EquipmentType.TRANSFORMER_WINDING]: '⊚',
  [EquipmentType.BUSBAR_SECTION]: '━━',
  [EquipmentType.BREAKER]: '⊙',
  [EquipmentType.FEEDER]: '⟶',
  [EquipmentType.CONNECTIVITY_NODE]: '●',
  [EquipmentType.TERMINAL]: '·',
  [EquipmentType.ENERGY_CONSUMER]: '🏠',
};

const TYPE_LABELS: Record<EquipmentType, string> = {
  [EquipmentType.ENERGY_SOURCE]: '电源',
  [EquipmentType.SUBSTATION]: '变电站',
  [EquipmentType.POWER_TRANSFORMER]: '主变',
  [EquipmentType.TRANSFORMER_WINDING]: '绕组',
  [EquipmentType.BUSBAR_SECTION]: '母线',
  [EquipmentType.BREAKER]: '断路器',
  [EquipmentType.FEEDER]: '馈线',
  [EquipmentType.CONNECTIVITY_NODE]: '连接点',
  [EquipmentType.TERMINAL]: '端子',
  [EquipmentType.ENERGY_CONSUMER]: '用户',
};

export const legendItems = Object.entries(TYPE_LABELS).map(([type, label]) => ({
  type: type as EquipmentType,
  label,
  color: TYPE_COLORS[type as EquipmentType],
}));

export function getTypeColor(type: EquipmentType): string {
  return TYPE_COLORS[type] || '#64748b';
}

export function getTypeIcon(type: EquipmentType): string {
  return TYPE_ICONS[type] || '●';
}

export function getTypeLabel(type: EquipmentType): string {
  return TYPE_LABELS[type] || type;
}

function convertToG6Data(
  nodes: EquipmentNode[],
  edges: ConnectionEdge[],
  lowVoltageIds: Set<string> = new Set()
): { nodes: NodeConfig[]; edges: EdgeConfig[] } {
  const inCycleIds = new Set<string>();
  for (const node of nodes) {
    if ((node as any)._inCycle) inCycleIds.add(node.id);
  }

  const g6Nodes: NodeConfig[] = nodes.map((node) => {
    const isBreaker = node.type === EquipmentType.BREAKER;
    const isOpen = node.open;
    const isEnergized = node.energized !== false;
    const inCycle = (node as any)._inCycle;
    const isLowVoltage = lowVoltageIds.has(node.id);
    const baseColor = getTypeColor(node.type);
    const color = !isEnergized ? '#64748b' : isLowVoltage ? LOW_VOLTAGE_COLOR : baseColor;
    const strokeColor = inCycle ? '#ef4444' : color;
    const lineWidth = inCycle ? 4 : isLowVoltage ? 4 : 2;

    let size = 32;
    if (node.type === EquipmentType.SUBSTATION) size = 56;
    else if (node.type === EquipmentType.POWER_TRANSFORMER) size = 44;
    else if (node.type === EquipmentType.BUSBAR_SECTION) size = 80;
    else if (node.type === EquipmentType.BREAKER) size = 28;
    else if (node.type === EquipmentType.ENERGY_CONSUMER) size = 26;
    else if (node.type === EquipmentType.ENERGY_SOURCE) size = 48;
    else if (node.type === EquipmentType.CONNECTIVITY_NODE) size = 12;
    else if (node.type === EquipmentType.TERMINAL) size = 8;

    const shape =
      node.type === EquipmentType.BUSBAR_SECTION
        ? 'rect'
        : node.type === EquipmentType.BREAKER
        ? 'breaker-node'
        : 'smartgrid-node';

    return {
      id: node.id,
      label: node.type === EquipmentType.CONNECTIVITY_NODE || node.type === EquipmentType.TERMINAL ? '' : node.name,
      size,
      shape,
      type: node.type,
      data: node,
      style: {
        fill: color,
        stroke: strokeColor,
        lineWidth,
        opacity: 0.95,
        shadowColor: isLowVoltage ? LOW_VOLTAGE_COLOR : inCycle ? '#ef4444' : 'transparent',
        shadowBlur: isLowVoltage ? 20 : inCycle ? 15 : 0,
      },
      labelCfg: {
        style: {
          fill: isLowVoltage ? '#fca5a5' : inCycle ? '#fca5a5' : '#e2e8f0',
          fontSize: 11,
          fontWeight: isLowVoltage || inCycle ? 700 : 500,
        },
        position: node.type === EquipmentType.BUSBAR_SECTION ? 'top' : 'bottom',
      },
      stateStyles: {
        selected: {
          fill: color,
          stroke: '#38bdf8',
          lineWidth: 5,
          shadowColor: '#38bdf8',
          shadowBlur: 20,
        },
        hover: {
          fill: color,
          stroke: '#fff',
          lineWidth: 3,
          shadowColor: '#fff',
          shadowBlur: 10,
        },
      },
      _isBreaker: isBreaker,
      _isOpen: isOpen,
      _isEnergized: isEnergized,
      _inCycle: inCycle,
      _lowVoltage: isLowVoltage,
      _baseColor: baseColor,
    };
  });

  const g6Edges: EdgeConfig[] = edges.map((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);
    const isEnergized =
      sourceNode?.energized !== false && targetNode?.energized !== false;
    const inCycleEdge =
      sourceNode && targetNode && inCycleIds.has(sourceNode.id) && inCycleIds.has(targetNode.id);

    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      relationship: edge.relationship,
      type: 'flow-edge',
      style: {
        stroke: inCycleEdge ? '#ef4444' : isEnergized ? '#38bdf8' : '#475569',
        lineWidth: inCycleEdge ? 3 : isEnergized ? 2 : 1.2,
        opacity: inCycleEdge ? 1 : isEnergized ? 0.8 : 0.4,
        endArrow: {
          path: 'M 4,0 L -4,-4 L -4,4 Z',
          fill: inCycleEdge ? '#ef4444' : isEnergized ? '#38bdf8' : '#475569',
          opacity: inCycleEdge ? 1 : isEnergized ? 0.8 : 0.4,
        },
        lineDash: isEnergized ? [] : [4, 4],
      },
    };
  });

  return { nodes: g6Nodes, edges: g6Edges };
}

export interface TopologyGraphProps {
  nodes: EquipmentNode[];
  edges: ConnectionEdge[];
  onNodeClick: (node: EquipmentNode | null) => void;
  selectedNodeId?: string;
}

export function createTopologyGraph(
  container: HTMLDivElement,
  onNodeClick: (node: EquipmentNode | null) => void
): Graph {
  const width = container.clientWidth;
  const height = container.clientHeight;

  G6.registerNode(
    'smartgrid-node',
    {
      draw(cfg: any, group) {
        const size = cfg.size || 32;
        const r = size / 2;
        const color = cfg.style?.fill || '#38bdf8';
        const strokeColor = cfg.style?.stroke || color;
        const lineWidth = cfg.style?.lineWidth || 2;
        const lowVoltage = cfg._lowVoltage;
        const inCycle = cfg._inCycle;

        if (lowVoltage) {
          const pulseR = r + 12;
          const pulseRing = group.addShape('circle', {
            attrs: {
              x: 0,
              y: 0,
              r: pulseR,
              fill: 'rgba(239, 68, 68, 0.1)',
              stroke: LOW_VOLTAGE_PULSE_COLOR,
              lineWidth: 2,
              opacity: 0.4,
            },
            name: 'pulse-ring',
            draggable: true,
          });

          pulseRing.animate(
            (ratio: number) => {
              const t = (Math.sin(ratio * Math.PI * 2) + 1) / 2;
              return {
                r: r + 8 + t * 10,
                opacity: 0.6 - t * 0.5,
                lineWidth: 2 + t * 2,
              };
            },
            {
              duration: 1500,
              repeat: true,
              easing: 'easeCubic',
            }
          );

          const glowRing = group.addShape('circle', {
            attrs: {
              x: 0,
              y: 0,
              r: r + 4,
              fill: 'rgba(239, 68, 68, 0.2)',
              stroke: LOW_VOLTAGE_COLOR,
              lineWidth: 0,
            },
            name: 'glow-ring',
            draggable: true,
          });

          alertAnimations.set(cfg.id as string, {
            shapes: [pulseRing, glowRing],
            active: true,
          });
        }

        const keyShape = group.addShape('circle', {
          attrs: {
            x: 0,
            y: 0,
            r,
            fill: color,
            stroke: strokeColor,
            lineWidth,
            shadowColor: cfg.style?.shadowColor || 'transparent',
            shadowBlur: cfg.style?.shadowBlur || 0,
          },
          name: 'node-key',
          draggable: true,
        });

        return keyShape;
      },

      update(cfg: any, item: INode) {
        const group = item.getContainer();
        const model = item.getModel() as any;
        const keyShape = group.getFirst() as any;
        const cfgLow = cfg._lowVoltage;
        const cfgColor = cfg.style?.fill || model._baseColor || '#38bdf8';
        const curLow = model._lowVoltage;
        const baseColor = model._baseColor || cfgColor;

        const targetColor = cfgLow ? LOW_VOLTAGE_COLOR : baseColor;
        const targetStroke = cfg.style?.stroke || targetColor;
        const targetLineWidth = cfg.style?.lineWidth || 2;
        const targetShadowColor = cfg.style?.shadowColor || 'transparent';
        const targetShadowBlur = cfg.style?.shadowBlur || 0;
        const targetLabelColor = cfgLow ? '#fca5a5' : cfg._inCycle ? '#fca5a5' : '#e2e8f0';
        const targetFontWeight = cfgLow || cfg._inCycle ? 700 : 500;

        const duration = 600;
        const startTime = Date.now();
        const startColor = model._lastFill || baseColor;
        const currentColor = keyShape.attr('fill');

        if (cfgLow && !curLow) {
          const r = (cfg.size || 32) / 2;
          if (!alertAnimations.get(cfg.id)) {
            const pulseRing = group.addShape('circle', {
              attrs: {
                x: 0,
                y: 0,
                r: r + 12,
                fill: 'rgba(239, 68, 68, 0.1)',
                stroke: LOW_VOLTAGE_PULSE_COLOR,
                lineWidth: 2,
                opacity: 0.4,
              },
              name: 'pulse-ring',
              draggable: true,
            });
            pulseRing.animate(
              (ratio: number) => {
                const t = (Math.sin(ratio * Math.PI * 2) + 1) / 2;
                return {
                  r: r + 8 + t * 10,
                  opacity: 0.6 - t * 0.5,
                  lineWidth: 2 + t * 2,
                };
              },
              {
                duration: 1500,
                repeat: true,
                easing: 'easeCubic',
              }
            );
            const glowRing = group.addShape('circle', {
              attrs: {
                x: 0,
                y: 0,
                r: r + 4,
                fill: 'rgba(239, 68, 68, 0.2)',
                stroke: LOW_VOLTAGE_COLOR,
                lineWidth: 0,
              },
              name: 'glow-ring',
              draggable: true,
            });
            alertAnimations.set(cfg.id, { shapes: [pulseRing, glowRing], active: true });
          }
        }

        if (!cfgLow && curLow) {
          const anim = alertAnimations.get(cfg.id);
          if (anim) {
            anim.shapes.forEach(s => {
              s.stopAnimate();
              s.remove();
            });
            alertAnimations.delete(cfg.id);
          }
        }

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const t = Math.min(1, elapsed / duration);
          const ease = 1 - Math.pow(1 - t, 3);
          const interpolated = lerpColor(startColor, targetColor, ease);
          const interpolatedStroke = lerpColor(
            cfgLow ? startColor : baseColor,
            targetStroke,
            ease
          );

          keyShape.attr({
            fill: interpolated,
            stroke: interpolatedStroke,
            lineWidth: targetLineWidth,
            shadowColor: targetShadowColor,
            shadowBlur: targetShadowBlur * ease,
          });

          const labelShape = group.get('children').find((c: any) => c.get('name') === 'label');
          if (labelShape) {
            labelShape.attr({
              fill: targetLabelColor,
              fontWeight: targetFontWeight,
            });
          }

          model._lastFill = interpolated;
          model._lowVoltage = cfgLow;

          if (t < 1) {
            requestAnimationFrame(animate);
          }
        };

        requestAnimationFrame(animate);
      },
    },
    'single-node'
  );

  G6.registerNode(
    'breaker-node',
    {
      draw(cfg: any, group) {
        const size = cfg.size || 28;
        const r = size / 2;
        const isOpen = cfg._isOpen;
        const inCycle = cfg._inCycle;
        const color = cfg._isEnergized === false ? '#64748b' : '#f97316';
        const strokeColor = inCycle ? '#ef4444' : color;
        const strokeWidth = inCycle ? 5 : 3;

        const keyShape = group.addShape('circle', {
          attrs: {
            x: 0,
            y: 0,
            r,
            fill: isOpen ? '#1e293b' : color,
            stroke: strokeColor,
            lineWidth: strokeWidth,
            shadowColor: inCycle ? '#ef4444' : 'transparent',
            shadowBlur: inCycle ? 15 : 0,
          },
          name: 'breaker-circle',
        });

        group.addShape('line', {
          attrs: {
            x1: isOpen ? -r * 0.4 : -r * 0.6,
            y1: isOpen ? -r * 0.4 : 0,
            x2: isOpen ? r * 0.4 : r * 0.6,
            y2: isOpen ? r * 0.4 : 0,
            stroke: isOpen ? '#ef4444' : '#fff',
            lineWidth: 3,
          },
          name: 'breaker-indicator',
        });

        return keyShape;
      },
    },
    'circle'
  );

  G6.registerEdge(
    'flow-edge',
    {
      afterDraw(cfg: any, group) {
        if (!cfg.style || cfg.style.opacity < 0.5) return;

        const shape = group.get('children')[0];
        if (!shape) return;

        const length = shape.getTotalLength();
        const r = 4;

        const dot = group.addShape('circle', {
          attrs: {
            x: 0,
            y: 0,
            r,
            fill: '#7dd3fc',
            shadowColor: '#38bdf8',
            shadowBlur: 10,
          },
          name: 'flow-dot',
        });

        let curveness = 0;
        if (cfg.startPoint && cfg.endPoint) {
          const dx = cfg.endPoint.x - cfg.startPoint.x;
          const dy = cfg.endPoint.y - cfg.startPoint.y;
          curveness = dx === 0 ? 0.2 : 0;
        }

        dot.animate(
          (ratio: number) => {
            try {
              let tmpPoint;
              if (shape.getPoint) {
                tmpPoint = shape.getPoint(ratio);
              } else {
                tmpPoint = {
                  x: cfg.startPoint.x + (cfg.endPoint.x - cfg.startPoint.x) * ratio,
                  y: cfg.startPoint.y + (cfg.endPoint.y - cfg.startPoint.y) * ratio,
                };
              }
              return {
                x: tmpPoint.x,
                y: tmpPoint.y,
              };
            } catch (e) {
              return { x: 0, y: 0 };
            }
          },
          {
            duration: 3000,
            repeat: true,
            easing: 'easeCubic',
          }
        );
      },
    },
    'cubic'
  );

  const layout: LayoutConfig = {
    type: 'dagre',
    rankdir: 'TB',
    align: 'UL',
    nodesep: 40,
    ranksep: 80,
    controlPoints: true,
  };

  const graph = new G6.Graph({
    container,
    width,
    height,
    fitView: true,
    fitViewPadding: 60,
    animate: true,
    defaultNode: {
      type: 'circle',
      size: 32,
    },
    defaultEdge: {
      type: 'flow-edge',
    },
    layout,
    modes: {
      default: [
        'drag-canvas',
        'zoom-canvas',
        'drag-node',
        {
          type: 'click-select',
          multiple: false,
        },
        {
          type: 'tooltip',
          formatText: (model: any) => {
            if (!model.data) return '';
            const d: EquipmentNode = model.data;
            const typeLabel = getTypeLabel(d.type);
            const status = d.energized === false ? '断电' : '带电';
            return `<div style="font-family:sans-serif;">
              <div style="font-weight:600;font-size:13px;margin-bottom:6px;color:#38bdf8;">${d.name}</div>
              <div style="font-size:12px;color:#94a3b8;">类型: ${typeLabel}</div>
              ${d.baseVoltage ? `<div style="font-size:12px;color:#94a3b8;">电压: ${d.baseVoltage}kV</div>` : ''}
              <div style="font-size:12px;color:${d.energized === false ? '#ef4444' : '#22c55e'};">状态: ${status}</div>
              ${d.open !== undefined ? `<div style="font-size:12px;color:${d.open ? '#f97316' : '#22c55e'};">${d.open ? '分闸' : '合闸'}</div>` : ''}
            </div>`;
          },
          offset: 8,
        },
      ],
    },
    nodeStateStyles: {
      selected: {
        stroke: '#38bdf8',
        lineWidth: 4,
        shadowColor: '#38bdf8',
        shadowBlur: 20,
      },
    },
  });

  graph.on('node:click', (evt) => {
    if (evt.item) {
      const model = evt.item.getModel() as any;
      onNodeClick(model.data as EquipmentNode);
    }
  });

  graph.on('canvas:click', () => {
    onNodeClick(null);
  });

  graph.on('wheelzoom', () => {});

  return graph;
}

export function updateGraphData(
  graph: Graph,
  nodes: EquipmentNode[],
  edges: ConnectionEdge[],
  selectedNodeId?: string,
  lowVoltageIds: Set<string> = new Set()
) {
  if (!graph || nodes.length === 0) {
    graph?.changeData({ nodes: [], edges: [] });
    return;
  }

  const { nodes: g6Nodes, edges: g6Edges } = convertToG6Data(nodes, edges, lowVoltageIds);

  graph.changeData({ nodes: g6Nodes, edges: g6Edges });

  setTimeout(() => {
    graph.fitView(60);
    if (selectedNodeId) {
      graph.setItemState(selectedNodeId, 'selected', true);
    }
  }, 100);
}

export function updateLowVoltageNodes(
  graph: Graph,
  alerts: LowVoltageAlert[]
) {
  if (!graph || !alerts) return;

  const alertMap = new Map<string, LowVoltageAlert>();
  for (const alert of alerts) {
    alertMap.set(alert.nodeId, alert);
  }

  const nodes = graph.getNodes();
  const nodesToUpdate = new Set<string>();

  for (const node of nodes) {
    const id = node.getID();
    const model = node.getModel() as any;
    const isCurrentlyAlert = model._lowVoltage;
    const shouldBeAlert = alertMap.has(id);

    if (isCurrentlyAlert !== shouldBeAlert) {
      nodesToUpdate.add(id);
    }
  }

  for (const id of nodesToUpdate) {
    const nodeItem = graph.findById(id) as INode;
    if (!nodeItem) continue;

    const model = nodeItem.getModel() as any;
    const isAlert = alertMap.has(id);
    const alert = alertMap.get(id);

    const size = model.size || 32;
    const baseColor = model._baseColor || '#38bdf8';
    const inCycle = model._inCycle;
    const color = isAlert ? LOW_VOLTAGE_COLOR : baseColor;
    const strokeColor = inCycle ? '#ef4444' : color;
    const lineWidth = inCycle ? 4 : isAlert ? 4 : 2;

    graph.updateItem(nodeItem, {
      _lowVoltage: isAlert,
      _voltage: alert?.voltageMagnitude,
      _voltageDrop: alert?.dropPercentage,
      style: {
        fill: color,
        stroke: strokeColor,
        lineWidth,
        shadowColor: isAlert ? LOW_VOLTAGE_COLOR : inCycle ? '#ef4444' : 'transparent',
        shadowBlur: isAlert ? 20 : inCycle ? 15 : 0,
      },
      size,
    });
  }
}

export function clearAllLowVoltageAlerts(graph: Graph) {
  if (!graph) return;
  updateLowVoltageNodes(graph, []);
}
