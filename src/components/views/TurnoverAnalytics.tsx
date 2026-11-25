import React, { useMemo } from 'react';
import { ArrowUpRight, ShieldAlert } from 'lucide-react';
import {
  computeDepartmentRollups,
  computeExecutiveKpis,
  computeMonthlyWorkforceTrends,
  computeTurnoverBreakdown,
} from '../../engine/hrAnalytics';
import { getAttritionModelEvaluation } from '../../engine/mlModels';
import { useHrData } from '../../context/HrDataContext';
import { Employee, GlobalFilters } from '../../types/hr';
import {
  BarComparisonChart,
  DonutBreakdownChart,
  HorizontalBarList,
  KpiCard,
  MultiLineTrendChart,
  PALETTE,
} from '../Charts';

interface TurnoverAnalyticsProps {
  filters: GlobalFilters;
  onSelectEmployee: (emp: Employee) => void;
}

export const TurnoverAnalytics: React.FC<TurnoverAnalyticsProps> = ({
  filters,
  onSelectEmployee,
}) => {
  const { dataset } = useHrData();
  const kpis = useMemo(() => computeExecutiveKpis(filters, dataset), [filters, dataset]);
  const trends = useMemo(() => computeMonthlyWorkforceTrends(filters, dataset), [filters, dataset]);
  const deptRollups = useMemo(() => computeDepartmentRollups(filters, dataset), [filters, dataset]);
  const turnover = useMemo(() => computeTurnoverBreakdown(filters, dataset), [filters, dataset]);
  const mlEval = useMemo(() => getAttritionModelEvaluation(filters, dataset), [filters, dataset]);

  const highRiskCount = mlEval.employeePredictions.filter(
    (p) => p.riskTier === 'High Risk'
  ).length;

  const avgExitTenure = useMemo(() => {
    if (turnover.events.length === 0) return 0;
    return (
      Math.round(
        (turnover.events.reduce((s, e) => s + e.tenureMonths, 0) / turnover.events.length) * 10
      ) / 10
    );
  }, [turnover.events]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Annualized Turnover Rate"
          value={`${kpis.turnoverRatePct}%`}
          subtext={`${kpis.exitedEmployees} recorded exits in window`}
          statusTag={{
            text: kpis.turnoverRatePct > 15 ? 'Above Benchmark' : 'Within Target',
            tone: kpis.turnoverRatePct > 15 ? 'warn' : 'good',
          }}
        />
        <KpiCard
          label="Employee Retention Rate"
          value={`${kpis.retentionRatePct}%`}
          subtext={`Net hiring delta: ${kpis.newHiresInPeriod - kpis.exitedEmployees >= 0 ? '+' : ''}${
            kpis.newHiresInPeriod - kpis.exitedEmployees
          }`}
          statusTag={{ text: 'Retained', tone: 'good' }}
        />
        <KpiCard
          label="Avg Tenure at Exit"
          value={`${avgExitTenure} mo`}
          subtext={`Overall workforce avg: ${kpis.avgTenureMonths} mo`}
          statusTag={{ text: 'Tenure Cohort', tone: 'neutral' }}
        />
        <KpiCard
          label="High Attrition Risk (Predicted)"
          value={String(highRiskCount)}
          subtext="Logistic regression estimate >= 62%"
          statusTag={{
            text: highRiskCount > 0 ? 'Proactive Review' : 'Low Exposure',
            tone: highRiskCount > 0 ? 'risk' : 'good',
          }}
        />
      </div>

      {/* Historical Hires vs Exits & Turnover Rate Trend */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              New Hires vs. Monthly Employee Exits
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Actual HR hiring and separation cadence across the selected timeline
            </p>
          </div>
          <MultiLineTrendChart
            labels={trends.map((t) => t.monthLabel)}
            series={[
              {
                id: 'hires',
                name: 'New Hires',
                color: PALETTE.sage,
                values: trends.map((t) => t.newHires),
              },
              {
                id: 'exits',
                name: 'Employee Exits',
                color: PALETTE.burgundy,
                values: trends.map((t) => t.exits),
              },
            ]}
            yMinOverride={0}
          />
        </div>

        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Department-Wise Attrition Rate (%)
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Annualized turnover comparison across business functions
            </p>
          </div>
          <BarComparisonChart
            items={[...deptRollups]
              .sort((a, b) => b.turnoverRatePct - a.turnoverRatePct)
              .map((d) => ({
                label: d.departmentName,
                shortLabel: d.departmentName.split(' ')[0],
                values: [
                  {
                    name: 'Turnover %',
                    value: d.turnoverRatePct,
                    color: d.turnoverRatePct > 18 ? PALETTE.crimson : PALETTE.burgundy,
                  },
                ],
              }))}
            valueSuffix="%"
          />
        </div>
      </div>

      {/* Exit Reasons, Exit Type, Tenure Buckets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">Exit Classification</h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">Voluntary vs. involuntary separations</p>
          </div>
          <DonutBreakdownChart
            slices={turnover.byType.map((t, i) => ({
              label: t.label,
              value: t.value,
              color: i === 0 ? PALETTE.burgundy : i === 1 ? PALETTE.roseGold : PALETTE.champagne,
            }))}
            centerLabel="Total Exits"
            centerValue={String(turnover.events.length)}
          />
        </div>

        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">Primary Exit Reasons</h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">Recorded separation root causes</p>
          </div>
          <HorizontalBarList
            items={turnover.byReason.slice(0, 6).map((r, i) => ({
              label: r.reason,
              value: r.count,
              displayValue: `${r.count} exits`,
              color: i === 0 ? PALETTE.burgundy : PALETTE.roseGold,
            }))}
          />
        </div>

        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">Exits by Tenure Cohort</h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">Retention vulnerability by length of service</p>
          </div>
          <HorizontalBarList
            items={turnover.tenureBuckets.map((tb) => ({
              label: tb.label,
              value: tb.count,
              displayValue: `${tb.count} staff`,
              color: PALETTE.burgundyLight,
            }))}
          />
        </div>
      </div>

      {/* Explainable Predictive Attrition Watchlist */}
      <div className="bg-[#FFFDF9] border border-[#B76E79]/50 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#75203C]">
              <ShieldAlert className="w-4 h-4" />
              <span>Explainable Predictive Analytics · Distinct from Historical HR Records</span>
            </div>
            <h3 className="text-base font-semibold text-[#2A1215] mt-1">
              Active Employee Attrition Risk Indicators
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Probabilities are estimated via L2-regularized Logistic Regression on workload, attendance, and KPI features only.
            </p>
          </div>
          <span className="text-xs font-mono text-[#6E5A58]">
            Model ROC-AUC: {mlEval.rocAuc}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E7DDD1] text-[#6E5A58]">
                <th className="py-2 text-left font-medium">Employee</th>
                <th className="py-2 text-left font-medium">Department</th>
                <th className="py-2 text-right font-medium">Overtime</th>
                <th className="py-2 text-right font-medium">Attendance</th>
                <th className="py-2 text-left font-medium pl-4">Primary Risk Driver</th>
                <th className="py-2 text-right font-medium">Predicted Risk</th>
                <th className="py-2 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3ECE2]">
              {mlEval.employeePredictions.slice(0, 10).map((pred) => {
                const emp = dataset.employees.find((e) => e.employeeId === pred.employeeId);
                const topDriver = pred.topDrivers[0];
                return (
                  <tr
                    key={pred.employeeId}
                    onClick={() => emp && onSelectEmployee(emp)}
                    className="hover:bg-[#FAF7F2] cursor-pointer transition-colors"
                  >
                    <td className="py-2.5">
                      <div className="font-medium text-[#2A1215]">{pred.fullName}</div>
                      <div className="text-[11px] text-[#6E5A58]">{pred.roleTitle}</div>
                    </td>
                    <td className="py-2.5 text-[#4E3837]">{pred.departmentName}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">
                      {pred.overtimeHoursAvg}h
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums">
                      {pred.avgAttendancePct}%
                    </td>
                    <td className="py-2.5 pl-4 text-[#4E3837]">
                      {topDriver
                        ? `${topDriver.factor} (${topDriver.impact > 0 ? '+' : ''}${topDriver.impact})`
                        : '—'}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums">
                      <span
                        className={`font-semibold ${
                          pred.riskTier === 'High Risk'
                            ? 'text-[#9E1B32]'
                            : pred.riskTier === 'Moderate Watch'
                            ? 'text-[#9A4B07]'
                            : 'text-[#2D6A4F]'
                        }`}
                      >
                        {Math.round(pred.predictedRiskProb * 100)}% ({pred.riskTier})
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-[#5C162E]">
                      <ArrowUpRight className="w-3.5 h-3.5 inline" />
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
