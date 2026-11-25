import React, { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { computeDepartmentRollups } from '../../engine/hrAnalytics';
import { useHrData } from '../../context/HrDataContext';
import { DepartmentRollup, GlobalFilters } from '../../types/hr';
import { BarComparisonChart, KpiCard, PALETTE } from '../Charts';

interface DepartmentAnalyticsProps {
  filters: GlobalFilters;
  onSelectDepartment: (rollup: DepartmentRollup) => void;
}

export const DepartmentAnalytics: React.FC<DepartmentAnalyticsProps> = ({
  filters,
  onSelectDepartment,
}) => {
  const { dataset } = useHrData();
  const rollups = useMemo(() => computeDepartmentRollups(filters, dataset), [filters, dataset]);

  const totalActive = rollups.reduce((s, r) => s + r.activeCount, 0);
  const totalTarget = rollups.reduce((s, r) => s + r.targetHeadcount, 0);
  const bestAttendance = [...rollups].sort((a, b) => b.avgAttendancePct - a.avgAttendancePct)[0];
  const highestTurnover = [...rollups].sort((a, b) => b.turnoverRatePct - a.turnoverRatePct)[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Business Units"
          value={String(rollups.length)}
          subtext={`${totalActive} active vs ${totalTarget} target seats`}
          statusTag={{
            text: totalActive >= totalTarget ? 'At Capacity' : 'Hiring Open',
            tone: totalActive >= totalTarget ? 'good' : 'neutral',
          }}
        />
        <KpiCard
          label="Net Headcount Variance"
          value={`${totalActive - totalTarget >= 0 ? '+' : ''}${totalActive - totalTarget}`}
          subtext="Active headcount minus budgeted plan"
          statusTag={{ text: 'Org Plan', tone: 'neutral' }}
        />
        <KpiCard
          label="Highest Attendance Unit"
          value={bestAttendance ? bestAttendance.departmentName.split(' ')[0] : '—'}
          subtext={bestAttendance ? `${bestAttendance.avgAttendancePct}% attendance rate` : ''}
          statusTag={{ text: 'Benchmark', tone: 'good' }}
        />
        <KpiCard
          label="Highest Turnover Unit"
          value={highestTurnover ? highestTurnover.departmentName.split(' ')[0] : '—'}
          subtext={highestTurnover ? `${highestTurnover.turnoverRatePct}% annualized turnover` : ''}
          statusTag={{
            text: highestTurnover && highestTurnover.turnoverRatePct > 18 ? 'Priority' : 'Watch',
            tone: highestTurnover && highestTurnover.turnoverRatePct > 18 ? 'risk' : 'warn',
          }}
        />
      </div>

      {/* Headcount & Performance Multi-Metric Comparison */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Department Headcount vs. Target Allocation
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Click any bar group to inspect department roster and exits
            </p>
          </div>
          <BarComparisonChart
            items={rollups.map((d) => ({
              label: d.departmentName,
              shortLabel: d.departmentName.split(' ')[0],
              metaId: d.departmentId,
              values: [
                { name: 'Active', value: d.activeCount, color: PALETTE.burgundy },
                { name: 'Target', value: d.targetHeadcount, color: PALETTE.roseGold },
              ],
            }))}
            onBarClick={(item) => {
              const found = rollups.find((r) => r.departmentId === item.metaId);
              if (found) onSelectDepartment(found);
            }}
          />
        </div>

        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Department Attendance vs. KPI Attainment
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Comparing operational presence against quarterly KPI execution
            </p>
          </div>
          <BarComparisonChart
            items={rollups.map((d) => ({
              label: d.departmentName,
              shortLabel: d.departmentName.split(' ')[0],
              metaId: d.departmentId,
              values: [
                { name: 'Attendance %', value: d.avgAttendancePct, color: PALETTE.burgundy },
                { name: 'KPI %', value: d.avgKpiPct, color: PALETTE.roseGold },
              ],
            }))}
            valueSuffix="%"
            onBarClick={(item) => {
              const found = rollups.find((r) => r.departmentId === item.metaId);
              if (found) onSelectDepartment(found);
            }}
          />
        </div>
      </div>

      {/* Full Departmental Scorecard Table */}
      <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-[#2A1215]">
            Department Intelligence Scorecard
          </h3>
          <p className="text-xs text-[#6E5A58] mt-0.5">
            Complete cross-functional comparison · Select any department row for drill-through inspection
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E7DDD1] text-[#6E5A58]">
                <th className="py-2.5 text-left font-medium">Department</th>
                <th className="py-2.5 text-right font-medium">Active</th>
                <th className="py-2.5 text-right font-medium">Target</th>
                <th className="py-2.5 text-right font-medium">Variance</th>
                <th className="py-2.5 text-right font-medium">New Hires</th>
                <th className="py-2.5 text-right font-medium">Turnover %</th>
                <th className="py-2.5 text-right font-medium">Attendance %</th>
                <th className="py-2.5 text-right font-medium">Avg Rating</th>
                <th className="py-2.5 text-right font-medium">KPI %</th>
                <th className="py-2.5 text-right font-medium">Avg Tenure</th>
                <th className="py-2.5 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3ECE2] tabular-nums">
              {rollups.map((d) => (
                <tr
                  key={d.departmentId}
                  onClick={() => onSelectDepartment(d)}
                  className="hover:bg-[#FAF7F2] cursor-pointer transition-colors"
                >
                  <td className="py-3 font-medium text-[#2A1215]">
                    {d.departmentName}
                    <div className="text-[11px] font-mono text-[#6E5A58] font-normal">
                      {d.costCenter}
                    </div>
                  </td>
                  <td className="py-3 text-right font-mono">{d.activeCount}</td>
                  <td className="py-3 text-right font-mono text-[#6E5A58]">{d.targetHeadcount}</td>
                  <td
                    className={`py-3 text-right font-mono font-medium ${
                      d.headcountVariance >= 0 ? 'text-[#2D6A4F]' : 'text-[#9A4B07]'
                    }`}
                  >
                    {d.headcountVariance >= 0 ? `+${d.headcountVariance}` : d.headcountVariance}
                  </td>
                  <td className="py-3 text-right font-mono">{d.newHiresCount}</td>
                  <td
                    className={`py-3 text-right font-mono font-medium ${
                      d.turnoverRatePct > 18 ? 'text-[#9E1B32]' : 'text-[#2A1215]'
                    }`}
                  >
                    {d.turnoverRatePct}%
                  </td>
                  <td className="py-3 text-right font-mono">{d.avgAttendancePct}%</td>
                  <td className="py-3 text-right font-mono text-[#5C162E] font-medium">
                    {d.avgPerformanceScore.toFixed(2)}
                  </td>
                  <td className="py-3 text-right font-mono">{d.avgKpiPct}%</td>
                  <td className="py-3 text-right font-mono">{d.avgTenureMonths}m</td>
                  <td className="py-3 text-right text-[#5C162E]">
                    <ArrowUpRight className="w-3.5 h-3.5 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
