import React, { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import {
  computeDepartmentRollups,
  computeExecutiveKpis,
  computeMonthlyWorkforceTrends,
} from '../../engine/hrAnalytics';
import { getAttritionModelEvaluation } from '../../engine/mlModels';
import { useHrData } from '../../context/HrDataContext';
import { DepartmentRollup, Employee, GlobalFilters } from '../../types/hr';
import {
  BarComparisonChart,
  DonutBreakdownChart,
  KpiCard,
  MultiLineTrendChart,
  PALETTE,
} from '../Charts';

interface ExecutiveOverviewProps {
  filters: GlobalFilters;
  onSelectEmployee: (emp: Employee) => void;
  onSelectDepartment: (rollup: DepartmentRollup) => void;
  onNavigateTab: (tab: string) => void;
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  filters,
  onSelectEmployee,
  onSelectDepartment,
  onNavigateTab,
}) => {
  const { dataset } = useHrData();
  const kpis = useMemo(() => computeExecutiveKpis(filters, dataset), [filters, dataset]);
  const trends = useMemo(() => computeMonthlyWorkforceTrends(filters, dataset), [filters, dataset]);
  const deptRollups = useMemo(() => computeDepartmentRollups(filters, dataset), [filters, dataset]);
  const mlEval = useMemo(() => getAttritionModelEvaluation(filters, dataset), [filters, dataset]);

  const deptColors = [
    PALETTE.burgundy,
    PALETTE.roseGold,
    '#7D2442',
    '#C8A28E',
    '#9E475C',
    '#D4B3A9',
  ];

  const donutSlices = deptRollups.map((d, i) => ({
    label: d.departmentName,
    value: d.activeCount,
    color: deptColors[i % deptColors.length],
  }));

  const highRiskWatchlist = mlEval.employeePredictions.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* 6 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Total Historical Cohort"
          value={String(kpis.totalHistoricalEmployees)}
          subtext={`${kpis.exitedEmployees} exits in ${filters.horizonMonths}m window`}
          statusTag={{ text: 'All Records', tone: 'neutral' }}
        />
        <KpiCard
          label="Active Employees"
          value={String(kpis.activeEmployees)}
          subtext={`Avg tenure ${kpis.avgTenureMonths} months`}
          statusTag={{ text: 'Active', tone: 'good' }}
        />
        <KpiCard
          label="New Hires"
          value={String(kpis.newHiresInPeriod)}
          subtext={`Last ${filters.horizonMonths} months`}
          statusTag={{ text: 'Inflow', tone: 'neutral' }}
        />
        <KpiCard
          label="Annualized Turnover"
          value={`${kpis.turnoverRatePct}%`}
          subtext={`Retention rate ${kpis.retentionRatePct}%`}
          statusTag={{
            text: kpis.turnoverRatePct > 15 ? 'Elevated' : 'Nominal',
            tone: kpis.turnoverRatePct > 15 ? 'warn' : 'good',
          }}
        />
        <KpiCard
          label="Avg Attendance Rate"
          value={`${kpis.avgAttendanceRatePct}%`}
          subtext={`Late arrival rate ${kpis.lateArrivalRatePct}%`}
          statusTag={{
            text: kpis.avgAttendanceRatePct >= 92 ? 'On Target' : 'Monitor',
            tone: kpis.avgAttendanceRatePct >= 92 ? 'good' : 'warn',
          }}
        />
        <KpiCard
          label="Avg Performance"
          value={`${kpis.avgPerformanceScore} / 5`}
          subtext={`KPI attainment ${kpis.avgKpiAchievementPct}%`}
          statusTag={{ text: 'Quarterly', tone: 'neutral' }}
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[#2A1215]">
                Monthly Workforce Trends & Attendance
              </h3>
              <p className="text-xs text-[#6E5A58] mt-0.5">
                Active headcount trajectory alongside monthly attendance reliability
              </p>
            </div>
            <span className="text-xs font-mono text-[#6E5A58]">
              {trends[0]?.monthLabel} – {trends[trends.length - 1]?.monthLabel}
            </span>
          </div>

          <MultiLineTrendChart
            labels={trends.map((t) => t.monthLabel)}
            series={[
              {
                id: 'hc',
                name: 'Active Headcount',
                color: PALETTE.burgundy,
                values: trends.map((t) => t.headcount),
              },
              {
                id: 'att',
                name: 'Attendance %',
                color: PALETTE.roseGold,
                values: trends.map((t) => t.attendanceRatePct),
              },
            ]}
            height={250}
          />
        </div>

        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Department Headcount Split
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Active workforce distribution across business units
            </p>
          </div>
          <DonutBreakdownChart
            slices={donutSlices}
            centerLabel="Active Staff"
            centerValue={String(kpis.activeEmployees)}
          />
        </div>
      </div>

      {/* Secondary Row: Hires vs Exits & ML Watchlist Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[#2A1215]">
                Department Headcount vs. Budgeted Target
              </h3>
              <p className="text-xs text-[#6E5A58] mt-0.5">
                Click any department bar to open its drill-through scorecard
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('departments')}
              className="text-xs font-medium text-[#5C162E] hover:underline whitespace-nowrap cursor-pointer"
            >
              View All Units
            </button>
          </div>

          <BarComparisonChart
            items={deptRollups.map((d) => ({
              label: d.departmentName,
              shortLabel: d.departmentName.split(' ')[0],
              metaId: d.departmentId,
              values: [
                { name: 'Active', value: d.activeCount, color: PALETTE.burgundy },
                { name: 'Target', value: d.targetHeadcount, color: PALETTE.roseGoldSoft },
              ],
            }))}
            onBarClick={(item) => {
              const found = deptRollups.find((d) => d.departmentId === item.metaId);
              if (found) onSelectDepartment(found);
            }}
          />
        </div>

        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[#2A1215]">
                Predictive Attrition Watchlist (Model Estimate)
              </h3>
              <p className="text-xs text-[#6E5A58] mt-0.5">
                Non-demographic logistic regression risk scores · Click row to inspect drivers
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('ml-lab')}
              className="text-xs font-medium text-[#5C162E] hover:underline whitespace-nowrap cursor-pointer"
            >
              Open ML Lab
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E7DDD1] text-[#6E5A58]">
                  <th className="py-2 text-left font-medium">Employee</th>
                  <th className="py-2 text-left font-medium">Department</th>
                  <th className="py-2 text-right font-medium">Overtime</th>
                  <th className="py-2 text-right font-medium">Est. Risk</th>
                  <th className="py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3ECE2]">
                {highRiskWatchlist.map((pred) => {
                  const emp = dataset.employees.find((e) => e.employeeId === pred.employeeId);
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
                        {pred.overtimeHoursAvg}h/mo
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-[#9E1B32]">
                        {Math.round(pred.predictedRiskProb * 100)}%
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
    </div>
  );
};
