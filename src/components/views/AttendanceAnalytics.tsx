import React, { useMemo } from 'react';
import {
  computeDepartmentRollups,
  computeExecutiveKpis,
  computeLeaveBreakdown,
  computeMonthlyWorkforceTrends,
  getFilteredEmployees,
  getFilteredMonthKeys,
} from '../../engine/hrAnalytics';
import { useHrData } from '../../context/HrDataContext';
import { GlobalFilters } from '../../types/hr';
import {
  AttendanceHeatmap,
  BarComparisonChart,
  DonutBreakdownChart,
  KpiCard,
  MultiLineTrendChart,
  PALETTE,
} from '../Charts';

interface AttendanceAnalyticsProps {
  filters: GlobalFilters;
}

export const AttendanceAnalytics: React.FC<AttendanceAnalyticsProps> = ({ filters }) => {
  const { dataset } = useHrData();
  const kpis = useMemo(() => computeExecutiveKpis(filters, dataset), [filters, dataset]);
  const trends = useMemo(() => computeMonthlyWorkforceTrends(filters, dataset), [filters, dataset]);
  const deptRollups = useMemo(() => computeDepartmentRollups(filters, dataset), [filters, dataset]);
  const leaveBreakdown = useMemo(() => computeLeaveBreakdown(filters, dataset), [filters, dataset]);

  const heatmapCells = useMemo(() => {
    if (filters.departmentId === 'ALL') return dataset.dailyAttendanceMatrix;
    return dataset.dailyAttendanceMatrix.filter(
      (c) => c.departmentId === filters.departmentId
    );
  }, [filters.departmentId, dataset]);

  const latestDayTotals = useMemo(() => {
    const lastDay = dataset.dailyAttendanceMatrix.filter((c) => c.dayIndex === 14);
    const filtered =
      filters.departmentId === 'ALL'
        ? lastDay
        : lastDay.filter((c) => c.departmentId === filters.departmentId);
    return {
      present: filtered.reduce((s, c) => s + c.presentCount, 0),
      absent: filtered.reduce((s, c) => s + c.absentCount, 0),
      late: filtered.reduce((s, c) => s + c.lateCount, 0),
      total: filtered.reduce((s, c) => s + c.totalActive, 0),
    };
  }, [filters.departmentId, dataset]);

  // Work mode attendance comparison
  const workModeStats = useMemo(() => {
    const emps = getFilteredEmployees(filters, dataset);
    const monthSet = new Set(getFilteredMonthKeys(filters.horizonMonths, dataset));
    const empMode = new Map(emps.map((e) => [e.employeeId, e.workMode]));
    const acc = new Map<string, { present: number; avail: number; late: number }>();

    for (const a of dataset.attendanceMonthly) {
      const mode = empMode.get(a.employeeId);
      if (!mode || !monthSet.has(a.monthKey)) continue;
      const cur = acc.get(mode) ?? { present: 0, avail: 0, late: 0 };
      acc.set(mode, {
        present: cur.present + a.presentDays,
        avail: cur.avail + Math.max(1, a.workingDays - a.leaveDays),
        late: cur.late + a.lateArrivals,
      });
    }

    return ['Hybrid', 'Remote', 'On-Site'].map((mode) => {
      const v = acc.get(mode);
      const attPct = v && v.avail > 0 ? Math.round((v.present / v.avail) * 1000) / 10 : 0;
      const latePct = v && v.present > 0 ? Math.round((v.late / v.present) * 1000) / 10 : 0;
      return { mode, attPct, latePct };
    });
  }, [filters, dataset]);

  const leaveColors = [PALETTE.burgundy, PALETTE.roseGold, PALETTE.champagne, '#7D2442'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Period Attendance Rate"
          value={`${kpis.avgAttendanceRatePct}%`}
          subtext={`Absenteeism rate ${(100 - kpis.avgAttendanceRatePct).toFixed(1)}%`}
          statusTag={{
            text: kpis.avgAttendanceRatePct >= 92 ? 'Healthy' : 'Monitor',
            tone: kpis.avgAttendanceRatePct >= 92 ? 'good' : 'warn',
          }}
        />
        <KpiCard
          label="Latest Daily Present / Absent"
          value={`${latestDayTotals.present} / ${latestDayTotals.absent}`}
          subtext={`Out of ${latestDayTotals.total} active staff on Nov 20`}
          statusTag={{ text: 'Daily Snapshot', tone: 'neutral' }}
        />
        <KpiCard
          label="Late Arrival Rate"
          value={`${kpis.lateArrivalRatePct}%`}
          subtext={`${latestDayTotals.late} late arrivals on latest workday`}
          statusTag={{
            text: kpis.lateArrivalRatePct > 5 ? 'Elevated' : 'Controlled',
            tone: kpis.lateArrivalRatePct > 5 ? 'warn' : 'good',
          }}
        />
        <KpiCard
          label="Approved Leave Days"
          value={String(kpis.totalLeaveDays)}
          subtext={`Across ${filters.horizonMonths}-month active window`}
          statusTag={{ text: 'Leave Log', tone: 'neutral' }}
        />
      </div>

      {/* Attendance Heatmap */}
      <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Daily Attendance Heatmap (Last 15 Workdays)
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Department-level daily presence intensity highlighting Monday/Friday absenteeism patterns
            </p>
          </div>
          <span className="text-xs font-mono text-[#6E5A58]">Nov 02 – Nov 20, 2026</span>
        </div>
        <AttendanceHeatmap cells={heatmapCells} />
      </div>

      {/* Trends & Leave Analysis */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Monthly Attendance & Late Arrival Trends
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Track seasonal attendance dips alongside punctuality variance
            </p>
          </div>
          <MultiLineTrendChart
            labels={trends.map((t) => t.monthLabel)}
            series={[
              {
                id: 'att',
                name: 'Attendance %',
                color: PALETTE.burgundy,
                values: trends.map((t) => t.attendanceRatePct),
              },
              {
                id: 'late',
                name: 'Late Arrival %',
                color: PALETTE.roseGold,
                values: trends.map((t) => t.lateRatePct),
              },
            ]}
            ySuffix="%"
          />
        </div>

        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Leave Utilization Breakdown
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Total leave days consumed by category during selected period
            </p>
          </div>
          <DonutBreakdownChart
            slices={leaveBreakdown.map((l, idx) => ({
              label: l.leaveType,
              value: l.days,
              color: leaveColors[idx % leaveColors.length],
            }))}
            centerLabel="Leave Days"
            centerValue={String(kpis.totalLeaveDays)}
          />
        </div>
      </div>

      {/* Department & Work Mode Comparison */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Department-Wise Attendance vs. Late Rate
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Cross-unit comparison of presence and punctuality
            </p>
          </div>
          <BarComparisonChart
            items={deptRollups.map((d) => ({
              label: d.departmentName,
              shortLabel: d.departmentName.split(' ')[0],
              values: [
                { name: 'Attendance %', value: d.avgAttendancePct, color: PALETTE.burgundy },
                { name: 'Late %', value: d.lateArrivalRatePct, color: PALETTE.roseGold },
              ],
            }))}
            valueSuffix="%"
          />
        </div>

        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Absenteeism & Punctuality by Work Mode
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Comparing Hybrid, Remote, and On-Site operational consistency
            </p>
          </div>
          <BarComparisonChart
            items={workModeStats.map((w) => ({
              label: w.mode,
              values: [
                { name: 'Attendance %', value: w.attPct, color: PALETTE.burgundy },
                { name: 'Late %', value: w.latePct, color: PALETTE.roseGold },
              ],
            }))}
            valueSuffix="%"
          />
        </div>
      </div>
    </div>
  );
};
