# 市级电网拓扑分析平台 (Smart Grid Topology Analysis Platform)

## 项目概述

本系统用于市级电网调度中心，构建高压/中压配电网的底层拓扑关系分析平台。

## 技术栈

### 后端
- **Node.js** + **NestJS** 企业级后端框架
- **Neo4j** 图数据库（持久化设备实体与连接关系）
- **fast-xml-parser** IEC 61970 CIM XML 解析

### 前端
- **React 18** + **TypeScript** + **Vite**
- **AntV G6** 图可视化引擎（DAG 有向无环图渲染）
- **Ant Design** UI 组件库
- **Zustand** 状态管理
- **Axios** HTTP 请求

## 核心功能

1. **CIM 数据解析**：解析符合 IEC 61970 CIM 标准的 XML/RDF 文件
2. **拓扑持久化**：设备实体（变电站、母线、断路器、变压器、馈线、用户）存储至 Neo4j
3. **下游拓扑查询**：按变电站查询下游 DAG 拓扑网络
4. **可视化展示**：
   - G6 渲染复杂有向无环图（DAG）
   - 设备类型颜色区分
   - 电流流向动态动画
   - 带电/断电状态展示
5. **设备交互**：点击设备查看属性面板，断路器分/合闸操作

## 项目结构

```
014-smartgrid-topology-web/
├── backend/                 # NestJS 后端
│   ├── src/
│   │   ├── cim-parser/      # CIM XML 解析模块
│   │   ├── topology/        # 拓扑业务模块
│   │   ├── neo4j/           # Neo4j 连接层
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── package.json
├── frontend/                # React 前端
│   ├── src/
│   │   ├── components/      # UI 组件
│   │   ├── graph/           # G6 图可视化逻辑
│   │   ├── api.ts           # API 请求封装
│   │   ├── store.ts         # Zustand 状态管理
│   │   ├── types.ts         # TypeScript 类型
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── README.md
```

## 快速开始

### 启动后端

```bash
cd backend
npm install
npm run start:dev
```

后端运行在 http://localhost:3001

环境变量（`.env`）：
```
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j123
PORT=3001
```

> 无需启动 Neo4j 也可运行，系统会自动降级为内存存储模式，并生成演示数据。

### 启动前端

```bash
cd frontend
npm install
npm run dev
```

前端运行在 http://localhost:5173

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/topology/import | 上传并导入 CIM XML 文件 |
| POST | /api/topology/demo | 生成演示拓扑数据 |
| GET | /api/topology/substations | 获取所有变电站列表 |
| GET | /api/topology/equipment/:id | 获取单个设备详情 |
| GET | /api/topology/downstream/:substationId | 获取变电站下游拓扑 |
| GET | /api/topology/stats | 获取全局数据统计 |
| POST | /api/topology/toggle-breaker/:id | 切换断路器分/合闸 |
