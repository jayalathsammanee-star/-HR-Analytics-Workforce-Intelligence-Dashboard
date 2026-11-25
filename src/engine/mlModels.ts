import { HR_DATASET, HrDataset } from '../data/syntheticHrData';
import {
  ClusteringSummary,
  Employee,
  EmployeeRiskAssessment,
  FeatureWeight,
  ForecastModelSummary,
  ForecastPoint,
  GlobalFilters,
  LogisticModelEvaluation,
  WorkforceClusterPoint,
} from '../types/hr';
import { computeMonthlyWorkforceTrends, getFilteredEmployees } from './hrAnalytics';

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function sigmoid(z: number): number {
  if (z > 30) return 1 - 1e-12;
  if (z < -30) return 1e-12;
  return 1 / (1 + Math.exp(-z));
}

interface EmployeeFeatureRow {
  employee: Employee;
  avgAttendancePct: number;
  lateArrivalRatePct: number;
  latestPerformanceScore: number;
  kpiAchievementPct: number;
  features: number[]; // Strictly non-demographic operational/behavioral features
  label: 0 | 1; // 1 = Exited, 0 = Active
}

const FEATURE_META = [
  { key: 'overtimeHoursAvg', label: 'Monthly Overtime Hours' },
  { key: 'avgAttendancePct', label: 'Attendance Rate (%)' },
  { key: 'lateArrivalRatePct', label: 'Late Arrival Rate (%)' },
  { key: 'latestPerformanceScore', label: 'Latest Performance Rating' },
  { key: 'kpiAchievementPct', label: 'KPI Achievement (%)' },
  { key: 'trainingHoursYtd', label: 'YTD Training Hours' },
  { key: 'promotionLast2Yr', label: 'Promoted in Last 2 Yrs' },
  { key: 'tenureMonths', label: 'Tenure (Months)' },
  { key: 'commuteDistanceKm', label: 'Commute Distance (km)' },
];

function buildFeatureDataset(dataset: HrDataset): EmployeeFeatureRow[] {
  // Pre-index attendance and performance per employee
  const attMap = new Map<string, { present: number; avail: number; late: number }>();
  for (const a of dataset.attendanceMonthly) {
    const prev = attMap.get(a.employeeId) ?? { present: 0, avail: 0, late: 0 };
    attMap.set(a.employeeId, {
      present: prev.present + a.presentDays,
      avail: prev.avail + Math.max(1, a.workingDays - a.leaveDays),
      late: prev.late + a.lateArrivals,
    });
  }

  const perfMap = new Map<string, { score: number; kpi: number; order: number }>();
  for (const p of dataset.performanceReviews) {
    const prev = perfMap.get(p.employeeId);
    if (!prev || p.periodOrder >= prev.order) {
      perfMap.set(p.employeeId, {
        score: p.ratingScore,
        kpi: p.kpiAchievementPct,
        order: p.periodOrder,
      });
    }
  }

  return dataset.employees.map((emp) => {
    const att = attMap.get(emp.employeeId);
    const avgAttendancePct = att && att.avail > 0 ? round1((att.present / att.avail) * 100) : 93.0;
    const lateArrivalRatePct = att && att.present > 0 ? round1((att.late / att.present) * 100) : 3.0;
    const perf = perfMap.get(emp.employeeId);
    const latestPerformanceScore = perf ? perf.score : 3.5;
    const kpiAchievementPct = perf ? perf.kpi : 86.0;

    return {
      employee: emp,
      avgAttendancePct,
      lateArrivalRatePct,
      latestPerformanceScore,
      kpiAchievementPct,
      features: [
        emp.overtimeHoursAvg,
        avgAttendancePct,
        lateArrivalRatePct,
        latestPerformanceScore,
        kpiAchievementPct,
        emp.trainingHoursYtd,
        emp.promotionLast2Yr ? 1 : 0,
        emp.tenureMonths,
        emp.commuteDistanceKm,
      ],
      label: emp.status === 'Exited' ? 1 : 0,
    };
  });
}

// Compute ROC-AUC using trapezoidal rule on sorted predictions
function computeRoc(yTrue: number[], yProb: number[]) {
  const pairs = yTrue.map((y, i) => ({ y, p: yProb[i] })).sort((a, b) => b.p - a.p);
  const totalPos = yTrue.filter((y) => y === 1).length;
  const totalNeg = yTrue.length - totalPos;
  if (totalPos === 0 || totalNeg === 0) {
    return { auc: 0.5, curve: [{ fpr: 0, tpr: 0 }, { fpr: 1, tpr: 1 }] };
  }

  let tp = 0;
  let fp = 0;
  const curve: Array<{ fpr: number; tpr: number }> = [{ fpr: 0, tpr: 0 }];
  for (const pair of pairs) {
    if (pair.y === 1) tp += 1;
    else fp += 1;
    curve.push({
      fpr: round2(fp / totalNeg),
      tpr: round2(tp / totalPos),
    });
  }

  let auc = 0;
  for (let i = 1; i < curve.length; i++) {
    auc += ((curve[i].fpr - curve[i - 1].fpr) * (curve[i].tpr + curve[i - 1].tpr)) / 2;
  }

  // Downsample curve cleanly to ~25 points for crisp SVG rendering
  const step = Math.max(1, Math.floor(curve.length / 24));
  const sampled = curve.filter((_, idx) => idx % step === 0 || idx === curve.length - 1);
  return { auc: round2(auc), curve: sampled };
}

interface TrainedLogisticModel {
  means: number[];
  stds: number[];
  weights: number[];
  bias: number;
  threshold: number;
  evaluation: LogisticModelEvaluation;
}

let cachedSignature = '';
let cachedModel: TrainedLogisticModel | null = null;

function trainAndEvaluateLogisticModel(dataset: HrDataset = HR_DATASET): TrainedLogisticModel {
  const sig = `${dataset.employees.length}:${dataset.turnoverEvents.length}:${dataset.performanceReviews.length}`;
  if (cachedModel && cachedSignature === sig) return cachedModel;

  const rows = buildFeatureDataset(dataset);
  // Deterministic stratified 80/20 split
  const positives = rows.filter((r) => r.label === 1);
  const negatives = rows.filter((r) => r.label === 0);

  const trainRows: EmployeeFeatureRow[] = [];
  const testRows: EmployeeFeatureRow[] = [];

  positives.forEach((r, idx) => (idx % 5 === 4 ? testRows.push(r) : trainRows.push(r)));
  negatives.forEach((r, idx) => (idx % 5 === 4 ? testRows.push(r) : trainRows.push(r)));

  const numFeatures = FEATURE_META.length;
  const means = new Array(numFeatures).fill(0);
  const stds = new Array(numFeatures).fill(1);

  for (let j = 0; j < numFeatures; j++) {
    const mean = trainRows.reduce((s, r) => s + r.features[j], 0) / trainRows.length;
    const variance =
      trainRows.reduce((s, r) => s + Math.pow(r.features[j] - mean, 2), 0) / trainRows.length;
    means[j] = mean;
    stds[j] = Math.max(1e-6, Math.sqrt(variance));
  }

  const standardize = (vec: number[]) => vec.map((v, j) => (v - means[j]) / stds[j]);

  const XTrain = trainRows.map((r) => standardize(r.features));
  const yTrain = trainRows.map((r) => r.label);

  // Balanced class weights so exit minority class is properly calibrated
  const posTrain = yTrain.filter((y) => y === 1).length;
  const negTrain = yTrain.length - posTrain;
  const posWeight = negTrain / Math.max(1, posTrain);

  const weights = new Array(numFeatures).fill(0);
  let bias = 0;
  const lr = 0.08;
  const l2 = 0.015;
  const epochs = 450;

  for (let ep = 0; ep < epochs; ep++) {
    const gradW = new Array(numFeatures).fill(0);
    let gradB = 0;

    for (let i = 0; i < XTrain.length; i++) {
      const x = XTrain[i];
      const y = yTrain[i];
      let z = bias;
      for (let j = 0; j < numFeatures; j++) z += weights[j] * x[j];
      const p = sigmoid(z);
      const sampleWeight = y === 1 ? Math.min(3.5, posWeight * 0.65) : 1.0;
      const err = (p - y) * sampleWeight;
      gradB += err;
      for (let j = 0; j < numFeatures; j++) {
        gradW[j] += err * x[j];
      }
    }

    const n = XTrain.length;
    bias -= lr * (gradB / n);
    for (let j = 0; j < numFeatures; j++) {
      weights[j] -= lr * (gradW[j] / n + l2 * weights[j]);
    }
  }

  // Evaluate on held-out test set
  const XTest = testRows.map((r) => standardize(r.features));
  const yTest = testRows.map((r) => r.label);
  const testProbs = XTest.map((x) => {
    let z = bias;
    for (let j = 0; j < numFeatures; j++) z += weights[j] * x[j];
    return sigmoid(z);
  });

  const threshold = 0.5;
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  for (let i = 0; i < yTest.length; i++) {
    const pred = testProbs[i] >= threshold ? 1 : 0;
    if (pred === 1 && yTest[i] === 1) tp++;
    else if (pred === 1 && yTest[i] === 0) fp++;
    else if (pred === 0 && yTest[i] === 0) tn++;
    else fn++;
  }

  const accuracy = round1(((tp + tn) / Math.max(1, yTest.length)) * 100);
  const precision = round1((tp / Math.max(1, tp + fp)) * 100);
  const recall = round1((tp / Math.max(1, tp + fn)) * 100);
  const f1Score = round1(
    precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0
  );
  const { auc: rocAuc, curve: rocCurve } = computeRoc(yTest, testProbs);

  const totalAbsWeight = weights.reduce((s, w) => s + Math.abs(w), 0) || 1;
  const featureWeights: FeatureWeight[] = FEATURE_META.map((meta, j): FeatureWeight => ({
    featureKey: meta.key,
    label: meta.label,
    weight: round2(weights[j]),
    absImportancePct: round1((Math.abs(weights[j]) / totalAbsWeight) * 100),
    direction: weights[j] >= 0 ? 'Increases Risk' : 'Reduces Risk',
  })).sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

  // Score all active employees with explainable per-feature contributions
  const employeePredictions: EmployeeRiskAssessment[] = rows
    .filter((r) => r.employee.status === 'Active')
    .map((r) => {
      const xStd = standardize(r.features);
      let z = bias;
      const drivers = FEATURE_META.map((meta, j) => {
        const contrib = weights[j] * xStd[j];
        z += contrib;
        return {
          factor: meta.label,
          impact: round2(contrib),
          detail: `${r.features[j]} (avg ${round1(means[j])})`,
        };
      }).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

      const prob = sigmoid(z);
      const riskTier: EmployeeRiskAssessment['riskTier'] =
        prob >= 0.62 ? 'High Risk' : prob >= 0.38 ? 'Moderate Watch' : 'Low Risk';

      return {
        employeeId: r.employee.employeeId,
        fullName: r.employee.fullName,
        roleTitle: r.employee.roleTitle,
        departmentId: r.employee.departmentId,
        departmentName: r.employee.departmentName,
        workMode: r.employee.workMode,
        tenureMonths: r.employee.tenureMonths,
        avgAttendancePct: r.avgAttendancePct,
        lateArrivalRatePct: r.lateArrivalRatePct,
        latestPerformanceScore: r.latestPerformanceScore,
        kpiAchievementPct: r.kpiAchievementPct,
        overtimeHoursAvg: r.employee.overtimeHoursAvg,
        trainingHoursYtd: r.employee.trainingHoursYtd,
        promotionLast2Yr: r.employee.promotionLast2Yr,
        predictedRiskProb: round2(prob),
        riskTier,
        topDrivers: drivers.slice(0, 4),
      };
    })
    .sort((a, b) => b.predictedRiskProb - a.predictedRiskProb);

  cachedModel = {
    means,
    stds,
    weights,
    bias,
    threshold,
    evaluation: {
      sampleSize: rows.length,
      trainSize: trainRows.length,
      testSize: testRows.length,
      accuracy,
      precision,
      recall,
      f1Score,
      rocAuc,
      confusionMatrix: { tp, fp, tn, fn },
      rocCurve,
      featureWeights,
      employeePredictions,
    },
  };

  cachedSignature = sig;
  return cachedModel;
}

export function getAttritionModelEvaluation(
  filters?: GlobalFilters,
  dataset: HrDataset = HR_DATASET
): LogisticModelEvaluation {
  const trained = trainAndEvaluateLogisticModel(dataset);
  if (!filters) return trained.evaluation;

  const filteredIds = new Set(getFilteredEmployees(filters, dataset).map((e) => e.employeeId));
  return {
    ...trained.evaluation,
    employeePredictions: trained.evaluation.employeePredictions.filter((p) =>
      filteredIds.has(p.employeeId)
    ),
  };
}

export function simulateWhatIfAttrition(params: {
  overtimeHoursAvg: number;
  avgAttendancePct: number;
  lateArrivalRatePct: number;
  latestPerformanceScore: number;
  kpiAchievementPct: number;
  trainingHoursYtd: number;
  promotionLast2Yr: boolean;
  tenureMonths: number;
  commuteDistanceKm: number;
}, dataset: HrDataset = HR_DATASET) {
  const trained = trainAndEvaluateLogisticModel(dataset);
  const rawVec = [
    params.overtimeHoursAvg,
    params.avgAttendancePct,
    params.lateArrivalRatePct,
    params.latestPerformanceScore,
    params.kpiAchievementPct,
    params.trainingHoursYtd,
    params.promotionLast2Yr ? 1 : 0,
    params.tenureMonths,
    params.commuteDistanceKm,
  ];
  let z = trained.bias;
  const contributions = FEATURE_META.map((meta, j) => {
    const xStd = (rawVec[j] - trained.means[j]) / trained.stds[j];
    const impact = trained.weights[j] * xStd;
    z += impact;
    return {
      label: meta.label,
      impact: round2(impact),
    };
  }).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  const probability = round2(sigmoid(z));
  const riskTier =
    probability >= 0.62 ? 'High Risk' : probability >= 0.38 ? 'Moderate Watch' : 'Low Risk';

  return { probability, riskTier, contributions };
}

// OLS Linear Regression helper with backtest metrics
function fitOls(yValues: number[]) {
  const n = yValues.length;
  const splitIdx = Math.max(6, n - 6); // Train on first 18 months, backtest on last 6

  const regress = (vals: number[]) => {
    const m = vals.length;
    const meanX = (m - 1) / 2;
    const meanY = vals.reduce((s, v) => s + v, 0) / m;
    let num = 0;
    let den = 0;
    for (let i = 0; i < m; i++) {
      num += (i - meanX) * (vals[i] - meanY);
      den += (i - meanX) * (i - meanX);
    }
    const slope = den > 0 ? num / den : 0;
    const intercept = meanY - slope * meanX;
    return { slope, intercept };
  };

  // Backtest on holdout last 6 points
  const trainModel = regress(yValues.slice(0, splitIdx));
  const testVals = yValues.slice(splitIdx);
  const testPreds = testVals.map((_, idx) => trainModel.intercept + trainModel.slope * (splitIdx + idx));
  const testMean = testVals.reduce((s, v) => s + v, 0) / Math.max(1, testVals.length);

  let absErr = 0;
  let sqErr = 0;
  let ssTot = 0;
  for (let i = 0; i < testVals.length; i++) {
    const e = testVals[i] - testPreds[i];
    absErr += Math.abs(e);
    sqErr += e * e;
    ssTot += Math.pow(testVals[i] - testMean, 2);
  }
  const mae = round2(absErr / Math.max(1, testVals.length));
  const rmse = round2(Math.sqrt(sqErr / Math.max(1, testVals.length)));
  // Compute full-fit R2 for model goodness-of-fit reporting
  const fullModel = regress(yValues);
  const fullMean = yValues.reduce((s, v) => s + v, 0) / n;
  let fullSqErr = 0;
  let fullTot = 0;
  for (let i = 0; i < n; i++) {
    const pred = fullModel.intercept + fullModel.slope * i;
    fullSqErr += Math.pow(yValues[i] - pred, 2);
    fullTot += Math.pow(yValues[i] - fullMean, 2);
  }
  const r2 = fullTot > 0 ? round2(Math.max(0, 1 - fullSqErr / fullTot)) : 0;
  const residualStd = Math.sqrt(fullSqErr / Math.max(1, n - 2));

  return {
    slope: fullModel.slope,
    intercept: fullModel.intercept,
    mae,
    rmse,
    r2,
    residualStd,
  };
}

export function computeWorkforceForecast(
  filters: GlobalFilters,
  dataset: HrDataset = HR_DATASET
): ForecastModelSummary {
  // Always use 24-month historical series for robust forecasting
  const fullHistory = computeMonthlyWorkforceTrends({ ...filters, horizonMonths: 24 }, dataset);
  const hcVals = fullHistory.map((p) => p.headcount);
  const turnVals = fullHistory.map((p) => p.turnoverRatePct);
  const attVals = fullHistory.map((p) => p.attendanceRatePct);

  const hcFit = fitOls(hcVals);
  const turnFit = fitOls(turnVals);
  const attFit = fitOls(attVals);

  const futureLabels = ['Dec 26', 'Jan 27', 'Feb 27', 'Mar 27', 'Apr 27', 'May 27'];
  const futureKeys = ['2026-12', '2027-01', '2027-02', '2027-03', '2027-04', '2027-05'];

  const series: ForecastPoint[] = fullHistory.map((pt, idx) => {
    const predHc = Math.round(hcFit.intercept + hcFit.slope * idx);
    const predTurn = round2(Math.max(0.2, turnFit.intercept + turnFit.slope * idx));
    const predAtt = round1(Math.min(99.5, Math.max(80, attFit.intercept + attFit.slope * idx)));
    return {
      monthKey: pt.monthKey,
      monthLabel: pt.monthLabel,
      isForecast: false,
      actualHeadcount: pt.headcount,
      predictedHeadcount: predHc,
      lowerBoundHeadcount: predHc,
      upperBoundHeadcount: predHc,
      actualTurnoverPct: pt.turnoverRatePct,
      predictedTurnoverPct: predTurn,
      actualAttendancePct: pt.attendanceRatePct,
      predictedAttendancePct: predAtt,
    };
  });

  for (let f = 0; f < 6; f++) {
    const idx = fullHistory.length + f;
    const predHc = Math.round(hcFit.intercept + hcFit.slope * idx);
    const band = Math.round(1.96 * hcFit.residualStd * (1 + f * 0.14));
    const seasonalAttAdj = f === 0 || f === 1 ? -0.6 : 0.2;
    series.push({
      monthKey: futureKeys[f],
      monthLabel: futureLabels[f],
      isForecast: true,
      actualHeadcount: null,
      predictedHeadcount: predHc,
      lowerBoundHeadcount: Math.max(0, predHc - band),
      upperBoundHeadcount: predHc + band,
      actualTurnoverPct: null,
      predictedTurnoverPct: round2(Math.max(0.2, turnFit.intercept + turnFit.slope * idx)),
      actualAttendancePct: null,
      predictedAttendancePct: round1(
        Math.min(99.5, Math.max(80, attFit.intercept + attFit.slope * idx + seasonalAttAdj))
      ),
    });
  }

  return {
    headcountMetrics: {
      r2: hcFit.r2,
      mae: hcFit.mae,
      rmse: hcFit.rmse,
      slopePerMonth: round2(hcFit.slope),
    },
    turnoverMetrics: {
      r2: turnFit.r2,
      mae: turnFit.mae,
      rmse: turnFit.rmse,
      slopePerMonth: round2(turnFit.slope),
    },
    attendanceMetrics: {
      r2: attFit.r2,
      mae: attFit.mae,
      rmse: attFit.rmse,
      slopePerMonth: round2(attFit.slope),
    },
    series,
  };
}

// K-Means Clustering (k=3) on active workforce operational vectors
export function computeWorkforceClusters(
  filters: GlobalFilters,
  dataset: HrDataset = HR_DATASET
): ClusteringSummary {
  const evalData = getAttritionModelEvaluation(filters, dataset);
  const emps = evalData.employeePredictions;

  if (emps.length < 3) {
    return {
      k: 3,
      iterations: 0,
      inertia: 0,
      clusters: [],
      points: [],
    };
  }

  // Features: [attendanceRatePct, kpiAchievementPct, overtimeHoursAvg, lateArrivalRatePct]
  const raw = emps.map((e) => [
    e.avgAttendancePct,
    e.kpiAchievementPct,
    e.overtimeHoursAvg,
    e.lateArrivalRatePct,
  ]);

  const d = 4;
  const means = new Array(d).fill(0);
  const stds = new Array(d).fill(1);
  for (let j = 0; j < d; j++) {
    means[j] = raw.reduce((s, r) => s + r[j], 0) / raw.length;
    const v = raw.reduce((s, r) => s + Math.pow(r[j] - means[j], 2), 0) / raw.length;
    stds[j] = Math.max(1e-6, Math.sqrt(v));
  }

  const X = raw.map((r) => r.map((v, j) => (v - means[j]) / stds[j]));

  // Deterministic seed centroids: highest KPI, highest overtime, lowest attendance
  let idxBest = 0;
  let idxOt = 0;
  let idxLowAtt = 0;
  emps.forEach((e, idx) => {
    if (e.kpiAchievementPct > emps[idxBest].kpiAchievementPct) idxBest = idx;
    if (e.overtimeHoursAvg > emps[idxOt].overtimeHoursAvg) idxOt = idx;
    if (e.avgAttendancePct < emps[idxLowAtt].avgAttendancePct) idxLowAtt = idx;
  });

  let centroids = [
    [...X[idxBest]],
    [...X[idxOt]],
    [...X[idxLowAtt]],
  ];

  const assignments = new Array<number>(X.length).fill(0);
  let iterations = 0;

  for (let iter = 0; iter < 25; iter++) {
    iterations = iter + 1;
    let changed = false;

    for (let i = 0; i < X.length; i++) {
      let bestC = 0;
      let bestDist = Infinity;
      for (let c = 0; c < 3; c++) {
        let dist = 0;
        for (let j = 0; j < d; j++) {
          const diff = X[i][j] - centroids[c][j];
          dist += diff * diff;
        }
        if (dist < bestDist) {
          bestDist = dist;
          bestC = c;
        }
      }
      if (assignments[i] !== bestC) {
        assignments[i] = bestC;
        changed = true;
      }
    }

    const sums = [new Array(d).fill(0), new Array(d).fill(0), new Array(d).fill(0)];
    const counts = [0, 0, 0];
    for (let i = 0; i < X.length; i++) {
      const c = assignments[i];
      counts[c] += 1;
      for (let j = 0; j < d; j++) sums[c][j] += X[i][j];
    }

    for (let c = 0; c < 3; c++) {
      if (counts[c] > 0) {
        centroids[c] = sums[c].map((s) => s / counts[c]);
      }
    }

    if (!changed) break;
  }

  let inertia = 0;
  for (let i = 0; i < X.length; i++) {
    const c = assignments[i];
    for (let j = 0; j < d; j++) {
      inertia += Math.pow(X[i][j] - centroids[c][j], 2);
    }
  }

  // Semantic naming based on empirical cluster centroids
  const clusterStats = ([0, 1, 2] as const).map((cid) => {
    const members = emps.filter((_, i) => assignments[i] === cid);
    const n = Math.max(1, members.length);
    return {
      cid,
      count: members.length,
      avgAttendancePct: round1(members.reduce((s, m) => s + m.avgAttendancePct, 0) / n),
      avgKpiPct: round1(members.reduce((s, m) => s + m.kpiAchievementPct, 0) / n),
      avgOvertimeHrs: round1(members.reduce((s, m) => s + m.overtimeHoursAvg, 0) / n),
      avgLatePct: round1(members.reduce((s, m) => s + m.lateArrivalRatePct, 0) / n),
    };
  });

  // Map raw cluster IDs to meaningful labels without collision
  const byOvertime = [...clusterStats].sort((a, b) => b.avgOvertimeHrs - a.avgOvertimeHrs);
  const burnoutCid = byOvertime[0].cid;
  const remaining = clusterStats.filter((c) => c.cid !== burnoutCid);
  remaining.sort((a, b) => b.avgKpiPct - a.avgKpiPct);
  const highPerfCid = remaining[0].cid;
  const driftCid = remaining[1].cid;

  const metaByCid = new Map<number, { label: string; description: string; orderedId: 0 | 1 | 2 }>([
    [
      highPerfCid,
      {
        orderedId: 0,
        label: 'Steady High Performers',
        description: 'Strong KPI delivery, consistent attendance, and sustainable overtime load.',
      },
    ],
    [
      burnoutCid,
      {
        orderedId: 1,
        label: 'Overextended / Workload Watch',
        description: 'Elevated monthly overtime hours driving elevated burnout and exit exposure.',
      },
    ],
    [
      driftCid,
      {
        orderedId: 2,
        label: 'Attendance & KPI Drift',
        description: 'Lower attendance reliability and softer KPI attainment requiring coaching.',
      },
    ],
  ]);

  const clusters = clusterStats
    .map((cs) => {
      const m = metaByCid.get(cs.cid)!;
      return {
        clusterId: m.orderedId,
        label: m.label,
        description: m.description,
        count: cs.count,
        avgAttendancePct: cs.avgAttendancePct,
        avgKpiPct: cs.avgKpiPct,
        avgOvertimeHrs: cs.avgOvertimeHrs,
        avgLatePct: cs.avgLatePct,
      };
    })
    .sort((a, b) => a.clusterId - b.clusterId);

  const points: WorkforceClusterPoint[] = emps.map((e, i) => {
    const m = metaByCid.get(assignments[i])!;
    return {
      employeeId: e.employeeId,
      fullName: e.fullName,
      departmentName: e.departmentName,
      attendanceRatePct: e.avgAttendancePct,
      kpiAchievementPct: e.kpiAchievementPct,
      overtimeHoursAvg: e.overtimeHoursAvg,
      lateArrivalRatePct: e.lateArrivalRatePct,
      clusterId: m.orderedId,
      clusterLabel: m.label,
    };
  });

  return {
    k: 3,
    iterations,
    inertia: round1(inertia),
    clusters,
    points,
  };
}
