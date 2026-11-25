import React, { useMemo, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import {
  computeDepartmentRollups,
  computePerformanceDistribution,
  getFilteredEmployees,
} from '../../engine/hrAnalytics';
import { useHrData } from '../../context/HrDataContext';
import { Employee, GlobalFilters } from '../../types/hr';
import {
  BarComparisonChart,
  HorizontalBarList,
  KpiCard,
  MultiLineTrendChart,
  PALETTE,
} from '../Charts';

interface PerformanceAnalyticsProps {
  filters: GlobalFilters;
  onSelectEmployee: (emp: Employee) => void;
}

export const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({
  filters,
  onSelectEmployee,
}) => {
  const { dataset } = useHrData();
  const [sortBy, setSortBy] = useState<'rating' | 'kpi'>('rating');

  const { buckets, quarterlyTrend } = useMemo(
    () => computePerformanceDistribution(filters, dataset),
    [filters, dataset]
  );
  const deptRollups = useMemo(() => computeDepartmentRollups(filters, dataset), [filters, dataset]);
  const employees = useMemo(() => getFilteredEmployees(filters, dataset), [filters, dataset]);

  // Latest performance per filtered employee
  const employeePerfRows = useMemo(() => {
    const empMap = new Map(employees.map((e) => [e.employeeId, e]));
    const latestMap = new Map<
      string,
      { rating: number; kpi: number; prod: number; delta: number; period: string }
    >();

    // Group reviews per employee sorted chronologically
    const reviewsByEmp = new Map<string, typeof dataset.performanceReviews>();
    for (const r of dataset.performanceReviews) {
      if (!empMap.has(r.employeeId)) continue;
      const list = reviewsByEmp.get(r.employeeId) ?? [];
      list.push(r);
      reviewsByEmp.set(r.employeeId, list);
    }

    reviewsByEmp.forEach((list, empId) => {
      list.sort((a, b) => a.periodOrder - b.periodOrder);
      const last = list[list.length - 1];
      const prev = list.length > 1 ? list[list.length - 2] : last;
      latestMap.set(empId, {
        rating: last.ratingScore,
        kpi: last.kpiAchievementPct,
        prod: last.productivityIndex,
        delta: Math.round((last.ratingScore - prev.ratingScore) * 100) / 100,
        period: last.reviewPeriod,
      });
    });

    return Array.from(latestMap.entries())
      .map(([empId, metrics]) => ({
        employee: empMap.get(empId)!,
        ...metrics,
      }))
      .sort((a, b) => (sortBy === 'rating' ? b.rating - a.rating : b.kpi - a.kpi))
      .slice(0, 15);
  }, [employees, sortBy, dataset]);

  const latestQ = quarterlyTrend[quarterlyTrend.length - 1];
  const prevQ = quarterlyTrend[quarterlyTrend.length - 2];
  const ratingDelta =
    latestQ && prevQ ? Math.round((latestQ.avgRating - prevQ.avgRating) * 100) / 100 : 0;

  const topDept = [...deptRollups].sort(
    (a, b) => b.avgPerformanceScore - a.avgPerformanceScore
  )[0];
  const exceedCount = (buckets[0]?.count ?? 0) + (buckets[1]?.count ?? 0);
  const totalReviewed = Math.max(
    1,
    buckets.reduce((s, b) => s + b.count, 0)
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Latest Quarter Avg Rating"
          value={`${latestQ?.avgRating ?? 0} / 5.0`}
          subtext={`QoQ shift: ${ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta} pts`}
          statusTag={{
            text: ratingDelta >= 0 ? 'Improving' : 'Softening',
            tone: ratingDelta >= 0 ? 'good' : 'warn',
          }}
        />
        <KpiCard
          label="KPI Achievement Avg"
          value={`${latestQ?.avgKpi ?? 0}%`}
          subtext={`Productivity index ${latestQ?.avgProductivity ?? 0}`}
          statusTag={{ text: '2026-Q4', tone: 'neutral' }}
        />
        <KpiCard
          label="High Performers (3.8+)"
          value={`${Math.round((exceedCount / totalReviewed) * 100)}%`}
          subtext={`${exceedCount} of ${totalReviewed} reviewed staff`}
          statusTag={{ text: 'Top Tier', tone: 'good' }}
        />
        <KpiCard
          label="Top Performing Dept"
          value={topDept ? topDept.departmentName.split(' ')[0] : 'N/A'}
          subtext={topDept ? `${topDept.avgPerformanceScore} avg · ${topDept.avgKpiPct}% KPI` : ''}
          statusTag={{ text: 'Leader', tone: 'neutral' }}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Performance & KPI Trend Over 8 Quarters
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Quarterly KPI attainment (%) and employee productivity index trajectory
            </p>
          </div>
          <MultiLineTrendChart
            labels={quarterlyTrend.map((q) => q.quarter)}
            series={[
              {
                id: 'kpi',
                name: 'KPI Attainment %',
                color: PALETTE.burgundy,
                values: quarterlyTrend.map((q) => q.avgKpi),
              },
              {
                id: 'prod',
                name: 'Productivity Index',
                color: PALETTE.roseGold,
                values: quarterlyTrend.map((q) => q.avgProductivity),
              },
            ]}
            ySuffix="%"
            yMinOverride={70}
          />
        </div>

        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Performance Rating Distribution
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Latest review cycle cohort spread across 5 appraisal tiers
            </p>
          </div>
          <HorizontalBarList
            items={buckets.map((b, idx) => ({
              label: b.label,
              value: b.count,
              displayValue: `${b.count} staff (${Math.round((b.count / totalReviewed) * 100)}%)`,
              color:
                idx === 0
                  ? PALETTE.burgundy
                  : idx === 1
                  ? PALETTE.burgundyLight
                  : idx === 2
                  ? PALETTE.roseGold
                  : idx === 3
                  ? PALETTE.champagne
                  : PALETTE.crimson,
            }))}
          />
        </div>
      </div>

      {/* Department KPI Comparison & Individual Scoreboard */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Department KPI Achievement %
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Cross-functional goal completion rates
            </p>
          </div>
          <BarComparisonChart
            items={deptRollups.map((d) => ({
              label: d.departmentName,
              shortLabel: d.departmentName.split(' ')[0],
              values: [{ name: 'KPI %', value: d.avgKpiPct, color: PALETTE.burgundy }],
            }))}
            valueSuffix="%"
          />
        </div>

        <div className="xl:col-span-3 bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-[#2A1215]">
                Individual Performance & Improvement Indicators
              </h3>
              <p className="text-xs text-[#6E5A58] mt-0.5">
                Top 15 reviewed records · Click any employee to inspect full review history
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-[#F3ECE2] rounded-lg">
              <button
                type="button"
                onClick={() => setSortBy('rating')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  sortBy === 'rating'
                    ? 'bg-[#FFFDF9] text-[#5C162E] shadow-xs'
                    : 'text-[#6E5A58] hover:text-[#2A1215]'
                }`}
              >
                By Rating
              </button>
              <button
                type="button"
                onClick={() => setSortBy('kpi')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  sortBy === 'kpi'
                    ? 'bg-[#FFFDF9] text-[#5C162E] shadow-xs'
                    : 'text-[#6E5A58] hover:text-[#2A1215]'
                }`}
              >
                By KPI %
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E7DDD1] text-[#6E5A58]">
                  <th className="py-2 text-left font-medium">Employee</th>
                  <th className="py-2 text-left font-medium">Dept</th>
                  <th className="py-2 text-right font-medium">Rating</th>
                  <th className="py-2 text-right font-medium">QoQ Delta</th>
                  <th className="py-2 text-right font-medium">KPI %</th>
                  <th className="py-2 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3ECE2]">
                {employeePerfRows.map((row) => (
                  <tr
                    key={row.employee.employeeId}
                    onClick={() => onSelectEmployee(row.employee)}
                    className="hover:bg-[#FAF7F2] cursor-pointer transition-colors"
                  >
                    <td className="py-2.5">
                      <div className="font-medium text-[#2A1215]">{row.employee.fullName}</div>
                      <div className="text-[11px] text-[#6E5A58]">{row.employee.roleTitle}</div>
                    </td>
                    <td className="py-2.5 text-[#4E3837]">
                      {row.employee.departmentName.split(' ')[0]}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-[#5C162E]">
                      {row.rating.toFixed(2)}
                    </td>
                    <td
                      className={`py-2.5 text-right font-mono tabular-nums ${
                        row.delta >= 0 ? 'text-[#2D6A4F]' : 'text-[#9E1B32]'
                      }`}
                    >
                      {row.delta >= 0 ? `+${row.delta.toFixed(2)}` : row.delta.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{row.kpi}%</td>
                    <td className="py-2.5 text-right text-[#5C162E]">
                      <ArrowUpRight className="w-3.5 h-3.5 inline" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
