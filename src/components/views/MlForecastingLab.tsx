import React, { useMemo, useState } from 'react';
import { ShieldCheck, SlidersHorizontal } from 'lucide-react';
import {
  computeWorkforceClusters,
  computeWorkforceForecast,
  getAttritionModelEvaluation,
  simulateWhatIfAttrition,
} from '../../engine/mlModels';
import { useHrData } from '../../context/HrDataContext';
import { Employee, GlobalFilters } from '../../types/hr';
import {
  HorizontalBarList,
  KpiCard,
  MultiLineTrendChart,
  PALETTE,
  ScatterClusterChart,
} from '../Charts';

interface MlForecastingLabProps {
  filters: GlobalFilters;
  onSelectEmployee: (emp: Employee) => void;
}

export const MlForecastingLab: React.FC<MlForecastingLabProps> = ({
  filters,
  onSelectEmployee,
}) => {
  const { dataset } = useHrData();
  const mlEval = useMemo(() => getAttritionModelEvaluation(filters, dataset), [filters, dataset]);
  const forecast = useMemo(() => computeWorkforceForecast(filters, dataset), [filters, dataset]);
  const clustering = useMemo(() => computeWorkforceClusters(filters, dataset), [filters, dataset]);

  const [forecastMetric, setForecastMetric] = useState<'headcount' | 'turnover' | 'attendance'>('headcount');

  // Interactive What-If Simulator State
  const [simOvertime, setSimOvertime] = useState(18);
  const [simAttendance, setSimAttendance] = useState(91);
  const [simLateRate, setSimLateRate] = useState(4.5);
  const [simPerf, setSimPerf] = useState(3.4);
  const [simKpi, setSimKpi] = useState(84);
  const [simTraining, setSimTraining] = useState(14);
  const [simPromoted, setSimPromoted] = useState(false);
  const [simTenure, setSimTenure] = useState(14);

  const simResult = useMemo(
    () =>
      simulateWhatIfAttrition({
        overtimeHoursAvg: simOvertime,
        avgAttendancePct: simAttendance,
        lateArrivalRatePct: simLateRate,
        latestPerformanceScore: simPerf,
        kpiAchievementPct: simKpi,
        trainingHoursYtd: simTraining,
        promotionLast2Yr: simPromoted,
        tenureMonths: simTenure,
        commuteDistanceKm: 18,
      }, dataset),
    [simOvertime, simAttendance, simLateRate, simPerf, simKpi, simTraining, simPromoted, simTenure, dataset]
  );

  // ROC curve SVG rendering helper
  const rocPath = useMemo(() => {
    const w = 260;
    const h = 190;
    const pad = 28;
    const pw = w - pad * 2;
    const ph = h - pad * 2;
    return mlEval.rocCurve
      .map((pt, i) => {
        const x = pad + pt.fpr * pw;
        const y = pad + ph - pt.tpr * ph;
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [mlEval.rocCurve]);

  const forecastStartIdx = forecast.series.findIndex((p) => p.isForecast);
  const clusterColors: Record<0 | 1 | 2, string> = {
    0: PALETTE.sage,
    1: PALETTE.crimson,
    2: PALETTE.roseGold,
  };

  return (
    <div className="space-y-6">
      {/* Governance Notice Banner */}
      <div className="bg-[#FFFDF9] border border-[#B76E79]/50 rounded-xl px-5 py-4 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#5C162E]">
            <ShieldCheck className="w-4 h-4" />
            <span>Model Governance & Ethical AI Compliance</span>
          </div>
          <p className="text-xs text-[#4E3837] leading-relaxed">
            All models below run live in-engine on the synthetic HR cohort ({mlEval.sampleSize} employees;{' '}
            {mlEval.trainSize} train / {mlEval.testSize} stratified holdout test). Protected characteristics are
            strictly excluded from feature vectors. Model outputs are advisory forecasts and never replace
            actual HR records.
          </p>
        </div>
        <div className="text-right font-mono text-xs text-[#6E5A58] tabular-nums">
          <div>Algorithm: L2 Logistic + OLS + K-Means</div>
          <div>Split: 80/20 Stratified Holdout</div>
        </div>
      </div>

      {/* Model Evaluation Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Test Accuracy"
          value={`${mlEval.accuracy}%`}
          subtext={`Evaluated on ${mlEval.testSize} holdout records`}
          statusTag={{ text: 'Logistic Reg', tone: 'neutral' }}
        />
        <KpiCard
          label="ROC-AUC Score"
          value={String(mlEval.rocAuc)}
          subtext="Trapezoidal area under ROC"
          statusTag={{
            text: mlEval.rocAuc >= 0.75 ? 'Strong Fit' : 'Baseline',
            tone: mlEval.rocAuc >= 0.75 ? 'good' : 'warn',
          }}
        />
        <KpiCard
          label="Precision / Recall"
          value={`${mlEval.precision}% / ${mlEval.recall}%`}
          subtext={`F1-Score: ${mlEval.f1Score}%`}
          statusTag={{ text: 'Exit Class', tone: 'neutral' }}
        />
        <KpiCard
          label="Forecast Backtest (HC)"
          value={`R² ${forecast.headcountMetrics.r2}`}
          subtext={`MAE ${forecast.headcountMetrics.mae} · RMSE ${forecast.headcountMetrics.rmse}`}
          statusTag={{ text: 'OLS 6m Test', tone: 'good' }}
        />
        <KpiCard
          label="K-Means Inertia (k=3)"
          value={String(clustering.inertia)}
          subtext={`Converged in ${clustering.iterations} iterations`}
          statusTag={{ text: 'Unsupervised', tone: 'neutral' }}
        />
      </div>

      {/* Logistic Regression Evaluation: Confusion Matrix, ROC Curve, Global Feature Weights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Holdout Confusion Matrix (n={mlEval.testSize})
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Actual vs. predicted attrition classifications on 20% test split
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-center text-xs pt-2">
            <div className="bg-[#2D6A4F]/10 border border-[#2D6A4F]/25 rounded-lg p-3">
              <div className="text-[11px] text-[#6E5A58]">True Negative (Retained)</div>
              <div className="text-2xl font-mono font-semibold text-[#2D6A4F] mt-1 tabular-nums">
                {mlEval.confusionMatrix.tn}
              </div>
            </div>
            <div className="bg-[#B45309]/10 border border-[#B45309]/25 rounded-lg p-3">
              <div className="text-[11px] text-[#6E5A58]">False Positive (Watch)</div>
              <div className="text-2xl font-mono font-semibold text-[#9A4B07] mt-1 tabular-nums">
                {mlEval.confusionMatrix.fp}
              </div>
            </div>
            <div className="bg-[#9E1B32]/10 border border-[#9E1B32]/25 rounded-lg p-3">
              <div className="text-[11px] text-[#6E5A58]">False Negative (Missed)</div>
              <div className="text-2xl font-mono font-semibold text-[#9E1B32] mt-1 tabular-nums">
                {mlEval.confusionMatrix.fn}
              </div>
            </div>
            <div className="bg-[#5C162E]/10 border border-[#5C162E]/30 rounded-lg p-3">
              <div className="text-[11px] text-[#6E5A58]">True Positive (Exit Caught)</div>
              <div className="text-2xl font-mono font-semibold text-[#5C162E] mt-1 tabular-nums">
                {mlEval.confusionMatrix.tp}
              </div>
            </div>
          </div>

          {/* ROC Curve */}
          <div className="pt-2 border-t border-[#F3ECE2]">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-[#2A1215]">ROC Curve</span>
              <span className="font-mono text-[#5C162E]">AUC = {mlEval.rocAuc}</span>
            </div>
            <svg viewBox="0 0 260 190" className="w-full max-w-[280px] mx-auto h-auto">
              <rect x={28} y={28} width={204} height={134} fill="#FAF7F2" stroke="#E7DDD1" />
              <line x1={28} y1={162} x2={232} y2={28} stroke="#C8A28E" strokeDasharray="4 4" />
              <path d={rocPath} fill="none" stroke={PALETTE.burgundy} strokeWidth={2.5} />
              <text x={130} y={182} textAnchor="middle" className="fill-[#6E5A58] text-[9px] font-mono">
                False Positive Rate
              </text>
              <text
                x={12}
                y={95}
                textAnchor="middle"
                transform="rotate(-90 12 95)"
                className="fill-[#6E5A58] text-[9px] font-mono"
              >
                True Positive Rate
              </text>
            </svg>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Global Explainable Feature Weights (Standardized Log-Odds)
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Relative influence of operational & workload signals on attrition probability
            </p>
          </div>
          <HorizontalBarList
            items={mlEval.featureWeights.map((fw) => ({
              label: `${fw.label} (${fw.direction})`,
              value: fw.absImportancePct,
              displayValue: `${fw.weight > 0 ? '+' : ''}${fw.weight} (${fw.absImportancePct}%)`,
              color: fw.direction === 'Increases Risk' ? PALETTE.burgundy : PALETTE.sage,
            }))}
          />
        </div>
      </div>

      {/* Workforce Trend Forecasting (OLS + Confidence Band) */}
      <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              6-Month Workforce Trend Forecast (Actual HR Records vs. OLS Prediction)
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Solid lines show historical actuals; dashed lines and shaded band show Dec 2026 – May 2027 forecast
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-[#F3ECE2] rounded-lg">
            {(['headcount', 'turnover', 'attendance'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setForecastMetric(m)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors cursor-pointer ${
                  forecastMetric === m
                    ? 'bg-[#FFFDF9] text-[#5C162E]'
                    : 'text-[#6E5A58] hover:text-[#2A1215]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {forecastMetric === 'headcount' && (
          <MultiLineTrendChart
            labels={forecast.series.map((p) => p.monthLabel)}
            series={[
              {
                id: 'actual_hc',
                name: 'Actual Headcount',
                color: PALETTE.burgundy,
                values: forecast.series.map((p) => p.actualHeadcount),
              },
              {
                id: 'pred_hc',
                name: 'OLS Forecast (Predicted)',
                color: PALETTE.roseGold,
                dashed: true,
                values: forecast.series.map((p) => p.predictedHeadcount),
              },
            ]}
            confidenceBand={{
              lower: forecast.series.map((p) => p.lowerBoundHeadcount),
              upper: forecast.series.map((p) => p.upperBoundHeadcount),
              forecastStartIndex: forecastStartIdx,
            }}
            height={260}
          />
        )}

        {forecastMetric === 'turnover' && (
          <MultiLineTrendChart
            labels={forecast.series.map((p) => p.monthLabel)}
            series={[
              {
                id: 'actual_turn',
                name: 'Actual Monthly Turnover %',
                color: PALETTE.burgundy,
                values: forecast.series.map((p) => p.actualTurnoverPct),
              },
              {
                id: 'pred_turn',
                name: 'OLS Forecast %',
                color: PALETTE.roseGold,
                dashed: true,
                values: forecast.series.map((p) => p.predictedTurnoverPct),
              },
            ]}
            ySuffix="%"
            yMinOverride={0}
            height={260}
          />
        )}

        {forecastMetric === 'attendance' && (
          <MultiLineTrendChart
            labels={forecast.series.map((p) => p.monthLabel)}
            series={[
              {
                id: 'actual_att',
                name: 'Actual Attendance %',
                color: PALETTE.burgundy,
                values: forecast.series.map((p) => p.actualAttendancePct),
              },
              {
                id: 'pred_att',
                name: 'OLS + Seasonal Forecast %',
                color: PALETTE.roseGold,
                dashed: true,
                values: forecast.series.map((p) => p.predictedAttendancePct),
              },
            ]}
            ySuffix="%"
            yMinOverride={84}
            height={260}
          />
        )}
      </div>

      {/* What-If Simulator & K-Means Clustering */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Interactive What-If Attrition Simulator */}
        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#5C162E]">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Interactive Scenario Testing</span>
              </div>
              <h3 className="text-base font-semibold text-[#2A1215] mt-0.5">
                What-If Attrition Risk Simulator
              </h3>
            </div>
            <div className="text-right">
              <div
                className={`text-2xl font-mono font-semibold tabular-nums ${
                  simResult.riskTier === 'High Risk'
                    ? 'text-[#9E1B32]'
                    : simResult.riskTier === 'Moderate Watch'
                    ? 'text-[#9A4B07]'
                    : 'text-[#2D6A4F]'
                }`}
              >
                {Math.round(simResult.probability * 100)}%
              </div>
              <div className="text-[11px] text-[#6E5A58]">{simResult.riskTier}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="space-y-1">
              <div className="flex justify-between">
                <span>Monthly Overtime</span>
                <span className="font-mono">{simOvertime}h</span>
              </div>
              <input
                type="range"
                min={0}
                max={36}
                value={simOvertime}
                onChange={(e) => setSimOvertime(Number(e.target.value))}
                className="w-full accent-[#5C162E]"
              />
            </label>

            <label className="space-y-1">
              <div className="flex justify-between">
                <span>Attendance Rate</span>
                <span className="font-mono">{simAttendance}%</span>
              </div>
              <input
                type="range"
                min={76}
                max={99}
                value={simAttendance}
                onChange={(e) => setSimAttendance(Number(e.target.value))}
                className="w-full accent-[#5C162E]"
              />
            </label>

            <label className="space-y-1">
              <div className="flex justify-between">
                <span>KPI Achievement</span>
                <span className="font-mono">{simKpi}%</span>
              </div>
              <input
                type="range"
                min={55}
                max={115}
                value={simKpi}
                onChange={(e) => setSimKpi(Number(e.target.value))}
                className="w-full accent-[#5C162E]"
              />
            </label>

            <label className="space-y-1">
              <div className="flex justify-between">
                <span>YTD Training Hours</span>
                <span className="font-mono">{simTraining}h</span>
              </div>
              <input
                type="range"
                min={2}
                max={60}
                value={simTraining}
                onChange={(e) => setSimTraining(Number(e.target.value))}
                className="w-full accent-[#5C162E]"
              />
            </label>

            <label className="space-y-1">
              <div className="flex justify-between">
                <span>Performance Rating</span>
                <span className="font-mono">{simPerf.toFixed(1)} / 5.0</span>
              </div>
              <input
                type="range"
                min={1.8}
                max={5.0}
                step={0.1}
                value={simPerf}
                onChange={(e) => setSimPerf(Number(e.target.value))}
                className="w-full accent-[#5C162E]"
              />
            </label>

            <label className="space-y-1">
              <div className="flex justify-between">
                <span>Tenure (Months)</span>
                <span className="font-mono">{simTenure} mo</span>
              </div>
              <input
                type="range"
                min={2}
                max={60}
                value={simTenure}
                onChange={(e) => setSimTenure(Number(e.target.value))}
                className="w-full accent-[#5C162E]"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#F3ECE2] text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={simPromoted}
                onChange={(e) => setSimPromoted(e.target.checked)}
                className="accent-[#5C162E]"
              />
              <span>Promoted in last 24 months</span>
            </label>
            <label className="flex items-center gap-2">
              <span>Late Rate:</span>
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                value={simLateRate}
                onChange={(e) => setSimLateRate(Number(e.target.value))}
                className="w-16 px-2 py-1 rounded border border-[#E7DDD1] bg-[#FAF7F2] font-mono"
              />
              <span>%</span>
            </label>
          </div>

          <div className="space-y-1.5 text-xs pt-1">
            <div className="font-medium text-[#2A1215]">Simulated Log-Odds Contributions</div>
            {simResult.contributions.slice(0, 4).map((c) => (
              <div key={c.label} className="flex justify-between text-[#4E3837]">
                <span>{c.label}</span>
                <span className={`font-mono ${c.impact > 0 ? 'text-[#9E1B32]' : 'text-[#2D6A4F]'}`}>
                  {c.impact > 0 ? `+${c.impact}` : c.impact}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* K-Means Workforce Pattern Clustering */}
        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              K-Means Attendance & Productivity Clustering (k=3)
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Unsupervised segmentation of active employees across attendance, KPI attainment, and overtime
            </p>
          </div>

          <ScatterClusterChart
            points={clustering.points.map((pt) => ({
              id: pt.employeeId,
              label: pt.fullName,
              sublabel: pt.departmentName,
              x: pt.attendanceRatePct,
              y: pt.kpiAchievementPct,
              color: clusterColors[pt.clusterId],
              clusterLabel: pt.clusterLabel,
            }))}
            xLabel="Attendance Rate (%)"
            yLabel="KPI Attainment (%)"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {clustering.clusters.map((cl) => (
              <div
                key={cl.clusterId}
                className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E7DDD1] text-xs space-y-1"
              >
                <div className="flex items-center gap-1.5 font-semibold text-[#2A1215]">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: clusterColors[cl.clusterId] }}
                  />
                  <span className="truncate">{cl.label}</span>
                </div>
                <div className="font-mono tabular-nums text-[#5C162E] font-medium">
                  {cl.count} staff · {cl.avgOvertimeHrs}h OT
                </div>
                <div className="text-[11px] text-[#6E5A58]">
                  Att {cl.avgAttendancePct}% · KPI {cl.avgKpiPct}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clickable High Risk Employees Table */}
      <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-3">
        <h3 className="text-base font-semibold text-[#2A1215]">
          Full Active Workforce Attrition Scoring Sample (Top 8 Highest Predicted Risk)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E7DDD1] text-[#6E5A58]">
                <th className="py-2 text-left font-medium">Employee</th>
                <th className="py-2 text-left font-medium">Department</th>
                <th className="py-2 text-right font-medium">Tenure</th>
                <th className="py-2 text-right font-medium">Overtime</th>
                <th className="py-2 text-right font-medium">Attendance</th>
                <th className="py-2 text-right font-medium">KPI %</th>
                <th className="py-2 text-right font-medium">Pred. Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3ECE2] tabular-nums">
              {mlEval.employeePredictions.slice(0, 8).map((p) => {
                const emp = dataset.employees.find((e) => e.employeeId === p.employeeId);
                return (
                  <tr
                    key={p.employeeId}
                    onClick={() => emp && onSelectEmployee(emp)}
                    className="hover:bg-[#FAF7F2] cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 font-medium text-[#2A1215]">{p.fullName}</td>
                    <td className="py-2.5 text-[#4E3837]">{p.departmentName}</td>
                    <td className="py-2.5 text-right font-mono">{p.tenureMonths}m</td>
                    <td className="py-2.5 text-right font-mono">{p.overtimeHoursAvg}h</td>
                    <td className="py-2.5 text-right font-mono">{p.avgAttendancePct}%</td>
                    <td className="py-2.5 text-right font-mono">{p.kpiAchievementPct}%</td>
                    <td className="py-2.5 text-right font-mono font-semibold text-[#9E1B32]">
                      {Math.round(p.predictedRiskProb * 100)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
