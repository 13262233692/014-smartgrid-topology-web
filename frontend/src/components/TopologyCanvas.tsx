import { useEffect, useRef } from 'react';
import { Graph } from '@antv/g6';
import { EquipmentNode, ConnectionEdge } from '../types';
import { createTopologyGraph, updateGraphData } from '../graph/topology-graph';

interface Props {
  nodes: EquipmentNode[];
  edges: ConnectionEdge[];
  onNodeClick: (node: EquipmentNode | null) => void;
  selectedNodeId?: string;
}

export default function TopologyCanvas({ nodes, edges, onNodeClick, selectedNodeId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const graph = createTopologyGraph(containerRef.current, onNodeClick);
    graphRef.current = graph;

    const handleResize = () => {
      if (!containerRef.current || !graph) return;
      graph.changeSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      graph.fitView(60);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      graph.destroy();
    };
  }, [onNodeClick]);

  useEffect(() => {
    if (graphRef.current) {
      updateGraphData(graphRef.current, nodes, edges, selectedNodeId);
    }
  }, [nodes, edges, selectedNodeId]);

  const handleZoomIn = () => {
    graphRef.current?.zoomTo(graphRef.current.getZoom() * 1.2);
  };

  const handleZoomOut = () => {
    graphRef.current?.zoomTo(graphRef.current.getZoom() * 0.8);
  };

  const handleFitView = () => {
    graphRef.current?.fitView(60);
  };

  return (
    <div className="canvas-area">
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {nodes.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">⚡</div>
          <div className="empty-title">暂无拓扑数据</div>
          <div className="empty-desc">请先导入 CIM 文件或生成演示数据，然后从左侧选择变电站</div>
        </div>
      )}

      {nodes.length > 0 && (
        <>
          <div className="graph-toolbar">
            <button onClick={handleZoomIn}>放大</button>
            <button onClick={handleZoomOut}>缩小</button>
            <button onClick={handleFitView}>适应</button>
          </div>
          <LegendPanel />
        </>
      )}
    </div>
  );
}

import { legendItems, getTypeColor } from '../graph/topology-graph';

function LegendPanel() {
  return (
    <div className="legend-panel">
      <h4>设备图例</h4>
      <div className="legend-list">
        {legendItems.slice(0, 8).map((item) => (
          <div key={item.type} className="legend-item">
            <span className="legend-color" style={{ background: getTypeColor(item.type) }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
