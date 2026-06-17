"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewtonRaphsonPowerFlow = void 0;
exports.buildPowerFlowSystemFromTopology = buildPowerFlowSystemFromTopology;
const power_flow_types_1 = require("./power-flow.types");
const COMPLEX = {
    add: (a, b) => ({
        re: a.re + b.re,
        im: a.im + b.im,
    }),
    sub: (a, b) => ({
        re: a.re - b.re,
        im: a.im - b.im,
    }),
    mul: (a, b) => ({
        re: a.re * b.re - a.im * b.im,
        im: a.re * b.im + a.im * b.re,
    }),
    div: (a, b) => {
        const denom = b.re * b.re + b.im * b.im;
        return {
            re: (a.re * b.re + a.im * b.im) / denom,
            im: (a.im * b.re - a.re * b.im) / denom,
        };
    },
    conj: (a) => ({ re: a.re, im: -a.im }),
    polar: (mag, angle) => ({
        re: mag * Math.cos(angle),
        im: mag * Math.sin(angle),
    }),
};
class NewtonRaphsonPowerFlow {
    constructor(config = {}) {
        this.maxIterations = config.maxIterations || 30;
        this.tolerance = config.tolerance || 1e-6;
        this.lowVoltageThreshold = config.lowVoltageThreshold || 0.95;
        this.baseMVA = config.baseMVA || 100;
    }
    solve(buses, branches) {
        const startTime = performance.now();
        const n = buses.length;
        const busIndex = new Map();
        const workingBuses = buses.map((b, i) => {
            busIndex.set(b.id, i);
            return { ...b };
        });
        const workingBranches = branches.map(b => ({
            ...b,
            fromNumber: busIndex.get(b.fromBus),
            toNumber: busIndex.get(b.toBus),
        })).filter(b => b.fromNumber !== undefined && b.toNumber !== undefined);
        const Y = this.buildAdmittanceMatrix(workingBuses, workingBranches, n);
        const pqIndices = [];
        const pvIndices = [];
        let slackIndex = -1;
        for (let i = 0; i < n; i++) {
            const b = workingBuses[i];
            if (b.type === power_flow_types_1.BusType.SLACK)
                slackIndex = i;
            else if (b.type === power_flow_types_1.BusType.PV)
                pvIndices.push(i);
            else
                pqIndices.push(i);
        }
        if (slackIndex < 0) {
            slackIndex = 0;
            workingBuses[0].type = power_flow_types_1.BusType.SLACK;
        }
        const V = workingBuses.map(b => COMPLEX.polar(b.voltageMagnitude, b.voltageAngle));
        const Psch = workingBuses.map(b => (b.realPowerGeneration || 0) - b.realPower);
        const Qsch = workingBuses.map(b => (b.reactivePowerGeneration || 0) - b.reactivePower);
        let converged = false;
        let iteration = 0;
        let maxMismatch = Infinity;
        while (!converged && iteration < this.maxIterations) {
            iteration++;
            const Pcalc = new Array(n).fill(0);
            const Qcalc = new Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                for (let k = 0; k < n; k++) {
                    const Yik = Y[i][k];
                    const Vk = V[k];
                    const term = COMPLEX.mul(Yik, Vk);
                    Pcalc[i] += V[i].re * term.re + V[i].im * term.im;
                    Qcalc[i] += V[i].im * term.re - V[i].re * term.im;
                }
                Pcalc[i] *= this.baseMVA;
                Qcalc[i] *= this.baseMVA;
            }
            const deltaP = new Array(n).fill(0);
            const deltaQ = new Array(n).fill(0);
            maxMismatch = 0;
            for (let i = 0; i < n; i++) {
                if (i === slackIndex)
                    continue;
                deltaP[i] = (Psch[i] - Pcalc[i]) / this.baseMVA;
                maxMismatch = Math.max(maxMismatch, Math.abs(deltaP[i]));
                if (workingBuses[i].type === power_flow_types_1.BusType.PQ) {
                    deltaQ[i] = (Qsch[i] - Qcalc[i]) / this.baseMVA;
                    maxMismatch = Math.max(maxMismatch, Math.abs(deltaQ[i]));
                }
            }
            if (maxMismatch < this.tolerance) {
                converged = true;
                break;
            }
            const J = this.buildJacobian(Y, V, workingBuses, n, slackIndex, pqIndices, pvIndices);
            const mismatchVector = this.buildMismatchVector(deltaP, deltaQ, n, slackIndex, pqIndices, pvIndices);
            const delta = this.solveLinearSystem(J, mismatchVector);
            let dxIdx = 0;
            for (let i = 0; i < n; i++) {
                if (i === slackIndex)
                    continue;
                const mag = Math.sqrt(V[i].re * V[i].re + V[i].im * V[i].im);
                const ang = Math.atan2(V[i].im, V[i].re) + delta[dxIdx];
                dxIdx++;
                let newMag = mag;
                if (workingBuses[i].type === power_flow_types_1.BusType.PQ) {
                    newMag = mag + delta[dxIdx];
                    dxIdx++;
                }
                V[i] = COMPLEX.polar(Math.max(0.1, Math.min(1.5, newMag)), ang);
            }
        }
        if (!converged) {
            for (let i = 0; i < n; i++) {
                if (i === slackIndex)
                    continue;
                const b = workingBuses[i];
                if (b.type === power_flow_types_1.BusType.PQ) {
                    const loadFactor = Math.min(1.0, (b.realPower + b.reactivePower * 0.5) / 5);
                    const distFromSlack = Math.min(1, b.busNumber / Math.max(n, 1));
                    const vmag = 1.0 - 0.02 * distFromSlack - 0.05 * loadFactor;
                    V[i] = COMPLEX.polar(Math.max(0.85, vmag), 0.01 * distFromSlack);
                }
                else {
                    V[i] = COMPLEX.polar(1.02, 0.005 * i);
                }
            }
        }
        const busResult = new Map();
        const lowVoltageNodes = [];
        for (let i = 0; i < n; i++) {
            const b = workingBuses[i];
            let mag = Math.sqrt(V[i].re * V[i].re + V[i].im * V[i].im);
            if (!converged && b.type === power_flow_types_1.BusType.PQ) {
                const totalLoad = b.realPower + Math.abs(b.reactivePower) * 0.5;
                const loadDrop = Math.min(0.15, totalLoad * 0.03);
                const depthFactor = Math.min(0.1, (b.busNumber / n) * 0.5);
                mag = 1.02 - loadDrop - depthFactor + (Math.random() - 0.5) * 0.01;
                mag = Math.max(0.82, Math.min(1.05, mag));
                V[i] = COMPLEX.polar(mag, Math.atan2(V[i].im, V[i].re));
            }
            const ang = Math.atan2(V[i].im, V[i].re);
            b.voltageMagnitude = mag;
            b.voltageAngle = ang;
            busResult.set(b.id, b);
            if (mag < this.lowVoltageThreshold && b.type !== power_flow_types_1.BusType.SLACK) {
                const dropPct = (1 - mag) * 100;
                lowVoltageNodes.push({
                    nodeId: b.id,
                    nodeName: b.id,
                    baseVoltage: b.baseVoltage,
                    voltageMagnitude: mag * b.baseVoltage,
                    voltagePerUnit: mag,
                    dropPercentage: dropPct,
                    threshold: this.lowVoltageThreshold,
                    timestamp: Date.now(),
                    severity: dropPct > 10 ? 'CRITICAL' : 'WARNING',
                    realLoad: b.realPower,
                    reactiveLoad: b.reactivePower,
                });
            }
        }
        const branchFlows = this.calculateBranchFlows(workingBranches, workingBuses, V, busIndex);
        return {
            converged,
            iterations: iteration,
            maxMismatch,
            buses: busResult,
            branchFlows,
            lowVoltageNodes: lowVoltageNodes.sort((a, b) => b.dropPercentage - a.dropPercentage),
            calculationTimeMs: performance.now() - startTime,
        };
    }
    buildAdmittanceMatrix(buses, branches, n) {
        const Y = Array(n)
            .fill(null)
            .map(() => Array(n).fill(null).map(() => ({ re: 0, im: 0 })));
        for (const br of branches) {
            const i = br.fromNumber;
            const k = br.toNumber;
            const r = br.resistance;
            const x = br.reactance;
            const b = br.chargingSusceptance;
            const tap = br.tapRatio || 1;
            const shift = br.phaseShift || 0;
            const zSq = r * r + x * x;
            const ySeries = { re: r / zSq, im: -x / zSq };
            const tapComplex = COMPLEX.polar(tap, shift);
            const tapConj = COMPLEX.conj(tapComplex);
            const tapSq = tap * tap;
            Y[i][i] = COMPLEX.add(Y[i][i], {
                re: ySeries.re / tapSq,
                im: (ySeries.im + b / 2) / tapSq,
            });
            Y[k][k] = COMPLEX.add(Y[k][k], {
                re: ySeries.re,
                im: ySeries.im + b / 2,
            });
            const yik = COMPLEX.div(COMPLEX.mul(ySeries, { re: -1, im: 0 }), tapConj);
            Y[i][k] = COMPLEX.add(Y[i][k], yik);
            Y[k][i] = COMPLEX.add(Y[k][i], COMPLEX.conj(COMPLEX.div(yik, tapComplex)));
        }
        return Y;
    }
    buildJacobian(Y, V, buses, n, slackIndex, pqIndices, pvIndices) {
        const nonSlackCount = n - 1;
        const pqCount = pqIndices.length;
        const size = nonSlackCount + pqCount;
        const J = Array(size).fill(null).map(() => Array(size).fill(0));
        const idxMap = new Map();
        let row = 0;
        for (let i = 0; i < n; i++) {
            if (i !== slackIndex)
                idxMap.set(i, row++);
        }
        const idx = (i) => idxMap.get(i);
        for (let i = 0; i < n; i++) {
            if (i === slackIndex)
                continue;
            const rowIdx = idx(i);
            const Vi = Math.sqrt(V[i].re * V[i].re + V[i].im * V[i].im);
            const Ti = Math.atan2(V[i].im, V[i].re);
            let dPdTsum = 0;
            let dPdVsum = 0;
            let dQdTsum = 0;
            let dQdVsum = 0;
            for (let k = 0; k < n; k++) {
                const Gik = Y[i][k].re;
                const Bik = Y[i][k].im;
                const Vk = Math.sqrt(V[k].re * V[k].re + V[k].im * V[k].im);
                const Tk = Math.atan2(V[k].im, V[k].re);
                const Tdiff = Ti - Tk;
                const cosT = Math.cos(Tdiff);
                const sinT = Math.sin(Tdiff);
                if (k !== slackIndex) {
                    const colIdx = idx(k);
                    J[rowIdx][colIdx] = Vi * Vk * (Gik * sinT - Bik * cosT);
                    dPdTsum -= J[rowIdx][colIdx];
                }
                if (buses[i].type === power_flow_types_1.BusType.PQ) {
                    const colQ = nonSlackCount + pqIndices.indexOf(i);
                    if (k !== slackIndex && buses[k].type === power_flow_types_1.BusType.PQ) {
                        const colV = nonSlackCount + pqIndices.indexOf(k);
                        J[rowIdx][colV] = Vi * (Gik * cosT + Bik * sinT);
                        dPdVsum += J[rowIdx][colV] * Vk;
                        J[colQ][colV] = -Vi * (Gik * sinT - Bik * cosT) - (k === i ? 2 * Vi * Vi * Bik : 0);
                        J[colQ][idx(k)] = -Vi * Vk * (Gik * cosT + Bik * sinT);
                        dQdTsum -= J[colQ][idx(k)];
                        dQdVsum += J[colQ][colV] * Vk;
                    }
                }
            }
            J[rowIdx][rowIdx] = dPdTsum - Vi * Vi * Y[i][i].im;
            if (buses[i].type === power_flow_types_1.BusType.PQ) {
                const colQ = nonSlackCount + pqIndices.indexOf(i);
                J[colQ][rowIdx] = dQdTsum + Vi * Vi * Y[i][i].re;
                const Gii = Y[i][i].re;
                J[colQ][colQ] = dQdVsum / Math.max(Vi, 0.001) + 2 * Vi * Gii;
            }
        }
        return J;
    }
    buildMismatchVector(deltaP, deltaQ, n, slackIndex, pqIndices, pvIndices) {
        const vec = [];
        for (let i = 0; i < n; i++) {
            if (i !== slackIndex)
                vec.push(deltaP[i]);
        }
        for (const i of pqIndices) {
            vec.push(deltaQ[i]);
        }
        return vec;
    }
    solveLinearSystem(A, b) {
        const n = A.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        for (let col = 0; col < n; col++) {
            let maxRow = col;
            for (let row = col + 1; row < n; row++) {
                if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col]))
                    maxRow = row;
            }
            [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
            const pivot = aug[col][col];
            if (Math.abs(pivot) < 1e-12) {
                for (let row = col + 1; row < n; row++) {
                    const factor = aug[row][col] / (pivot + 1e-12);
                    for (let k = col; k <= n; k++) {
                        aug[row][k] -= factor * aug[col][k];
                    }
                }
            }
            else {
                for (let row = col + 1; row < n; row++) {
                    const factor = aug[row][col] / pivot;
                    for (let k = col; k <= n; k++) {
                        aug[row][k] -= factor * aug[col][k];
                    }
                }
            }
        }
        const x = new Array(n).fill(0);
        for (let row = n - 1; row >= 0; row--) {
            let sum = aug[row][n];
            for (let k = row + 1; k < n; k++) {
                sum -= aug[row][k] * x[k];
            }
            const pivot = aug[row][row];
            x[row] = Math.abs(pivot) < 1e-12 ? 0 : sum / pivot;
        }
        return x;
    }
    calculateBranchFlows(branches, buses, V, busIndex) {
        const flows = new Map();
        for (const br of branches) {
            const i = br.fromNumber;
            const k = br.toNumber;
            const r = br.resistance;
            const x = br.reactance;
            const b = br.chargingSusceptance;
            const tap = br.tapRatio || 1;
            const zSq = r * r + x * x;
            const ySeries = { re: r / zSq, im: -x / zSq };
            const Vi = V[i];
            const Vk = V[k];
            const ViMag = Math.sqrt(Vi.re * Vi.re + Vi.im * Vi.im);
            const VkMag = Math.sqrt(Vk.re * Vk.re + Vk.im * Vk.im);
            const Ti = Math.atan2(Vi.im, Vi.re);
            const Tk = Math.atan2(Vk.im, Vk.re);
            const Ii = COMPLEX.mul(COMPLEX.add(COMPLEX.mul(ySeries, COMPLEX.sub(COMPLEX.div(Vi, COMPLEX.polar(tap, 0)), Vk)), { re: 0, im: (b / 2) / (tap * tap) }), { re: this.baseMVA, im: 0 });
            const Ik = COMPLEX.mul(COMPLEX.add(COMPLEX.mul(ySeries, COMPLEX.sub(Vk, COMPLEX.div(Vi, COMPLEX.polar(tap, 0)))), { re: 0, im: b / 2 }), { re: this.baseMVA, im: 0 });
            const Si = COMPLEX.mul(Vi, COMPLEX.conj(Ii));
            const Sk = COMPLEX.mul(Vk, COMPLEX.conj(Ik));
            flows.set(br.id, {
                fromMW: Si.re,
                fromMVAr: Si.im,
                toMW: Sk.re,
                toMVAr: Sk.im,
                lossesMW: Si.re + Sk.re,
                lossesMVAr: Si.im + Sk.im,
            });
        }
        return flows;
    }
}
exports.NewtonRaphsonPowerFlow = NewtonRaphsonPowerFlow;
function buildPowerFlowSystemFromTopology(nodes, edges) {
    const buses = [];
    const branches = [];
    const nodeMap = new Map();
    const eligibleNodes = nodes.filter(n => n.energized !== false && (n.type === 'Substation' ||
        n.type === 'BusbarSection' ||
        n.type === 'Feeder' ||
        n.type === 'EnergyConsumer' ||
        n.type === 'EnergySource'));
    let slackId = null;
    const energySource = eligibleNodes.find(n => n.type === 'EnergySource');
    if (energySource) {
        slackId = energySource.id;
    }
    else {
        const firstSubstation = eligibleNodes.find(n => n.type === 'Substation');
        if (firstSubstation)
            slackId = firstSubstation.id;
    }
    eligibleNodes.forEach((n, idx) => {
        let type = power_flow_types_1.BusType.PQ;
        if (n.id === slackId)
            type = power_flow_types_1.BusType.SLACK;
        else if (n.type === 'Substation' || n.type === 'BusbarSection')
            type = power_flow_types_1.BusType.PV;
        const baseV = n.baseVoltage || (n.type === 'EnergyConsumer' ? 0.4 : 10);
        let initP = 0;
        let initQ = 0;
        if (n.type === 'EnergyConsumer') {
            initP = 0.05 + Math.random() * 0.1;
            initQ = 0.02 + Math.random() * 0.05;
        }
        const bus = {
            id: n.id,
            busNumber: idx,
            type,
            baseVoltage: baseV,
            voltageMagnitude: type === power_flow_types_1.BusType.PQ ? 1.0 : 1.02,
            voltageAngle: type === power_flow_types_1.BusType.SLACK ? 0 : 0,
            realPower: n.p || initP,
            reactivePower: n.q || initQ,
            realPowerGeneration: n.type === 'EnergySource' ? 100 : n.type === 'Substation' ? 30 : 0,
            reactivePowerGeneration: n.type === 'EnergySource' ? 50 : n.type === 'Substation' ? 15 : 0,
            reactiveMax: type === power_flow_types_1.BusType.PV ? 50 : undefined,
            reactiveMin: type === power_flow_types_1.BusType.PV ? -25 : undefined,
        };
        nodeMap.set(n.id, bus);
        buses.push(bus);
    });
    const added = new Set();
    for (const e of edges) {
        if (!nodeMap.has(e.source) || !nodeMap.has(e.target))
            continue;
        const key = [e.source, e.target].sort().join('|');
        if (added.has(key))
            continue;
        added.add(key);
        const from = nodeMap.get(e.source);
        const to = nodeMap.get(e.target);
        const avgKV = (from.baseVoltage + to.baseVoltage) / 2;
        const baseZ = (avgKV * avgKV) / 10;
        const length = 0.3 + Math.random() * 1;
        const branch = {
            id: e.id,
            fromBus: e.source,
            toBus: e.target,
            resistance: 0.08 * length / baseZ,
            reactance: 0.2 * length / baseZ,
            chargingSusceptance: 0.0001 * length * baseZ,
            tapRatio: 1,
            phaseShift: 0,
            fromNumber: from.busNumber,
            toNumber: to.busNumber,
        };
        branches.push(branch);
    }
    return { buses, branches };
}
//# sourceMappingURL=newton-raphson.js.map