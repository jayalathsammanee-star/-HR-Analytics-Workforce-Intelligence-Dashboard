import { HR_DATASET, HrDataset } from '../data/syntheticHrData';
import {
  DepartmentRollup,
  Employee,
  ExecutiveKpis,
  GlobalFilters,
  MonthlyWorkforcePoint,
} from '../types/hr';

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

export function getFilteredMonthKeys(
  horizonMonths: 6 | 12 | 24,
  dataset: HrDataset = HR_DATASET
): string[] {
  const all = dataset.dateDimension.map((d) => d.monthKey);
  return all.slice(all.length - horizonMonths);
}

export function getFilteredEmployees(
  filters: GlobalFilters,
  dataset: HrDataset = HR_DATASET
): Employee[] {
  const q = filters.searchQuery.trim().toLowerCase();
  return dataset.employees.filter((emp) => {
    if (filters.departmentId !== 'ALL' && emp.departmentId !== filters.departmentId) return false;
    if (filters.workMode !== 'ALL' && emp.workMode !== filters.workMode) return false;
    if (
      q &&
      !emp.fullName.toLowerCase().includes(q) &&
      !emp.employeeId.toLowerCase().includes(q) &&
      !emp.roleTitle.toLowerCase().includes(q) &&
      !emp.departmentName.toLowerCase().includes(q)
    ) {
      return false;
    }
    return true;
  });
}

export function computeExecutiveKpis(
  filters: GlobalFilters,
  dataset: HrDataset = HR_DATASET
): ExecutiveKpis {
  const employees = getFilteredEmployees(filters, dataset);
  const empIds = new Set(employees.map((e) => e.employeeId));
  const monthKeys = getFilteredMonthKeys(filters.horizonMonths, dataset);
  const monthSet = new Set(monthKeys);
  const firstMonthKey = monthKeys[0];

  const activeEmployees = employees.filter((e) => e.status === 'Active').length;
  const newHiresInPeriod = employees.filter((e) => e.hireDate.slice(0, 7) >= firstMonthKey).length;

  const turnoverInPeriod = dataset.turnoverEvents.filter(
    (t) => empIds.has(t.employeeId) && monthSet.has(t.monthKey)
  );
  const exitedEmployees = turnoverInPeriod.length;

  // Annualized turnover rate across selected horizon
  const avgHeadcount = Math.max(1, activeEmployees + exitedEmployees * 0.5);
  const periodFactor = 12 / filters.horizonMonths;
  const turnoverRatePct = round1(((exitedEmployees * periodFactor) / avgHeadcount) * 100);
  const retentionRatePct = round1(Math.max(0, 100 - turnoverRatePct));

  const attRecords = dataset.attendanceMonthly.filter(
    (a) => empIds.has(a.employeeId) && monthSet.has(a.monthKey)
  );
  const totalWorkingMinusLeave = attRecords.reduce(
    (s, r) => s + Math.max(1, r.workingDays - r.leaveDays),
    0
  );
  const totalPresent = attRecords.reduce((s, r) => s + r.presentDays, 0);
  const totalLate = attRecords.reduce((s, r) => s + r.lateArrivals, 0);
  const avgAttendanceRatePct =
    totalWorkingMinusLeave > 0 ? round1((totalPresent / totalWorkingMinusLeave) * 100) : 0;
  const lateArrivalRatePct =
    totalPresent > 0 ? round1((totalLate / totalPresent) * 100) : 0;

  // Map horizon months to quarters
  const quarterSet = new Set(
    dataset.dateDimension
      .filter((d) => monthSet.has(d.monthKey))
      .map((d) => d.quarter)
  );
  const perfRecords = dataset.performanceReviews.filter(
    (p) => empIds.has(p.employeeId) && quarterSet.has(p.reviewPeriod)
  );
  const avgPerformanceScore =
    perfRecords.length > 0
      ? round2(perfRecords.reduce((s, p) => s + p.ratingScore, 0) / perfRecords.length)
      : 0;
  const avgKpiAchievementPct =
    perfRecords.length > 0
      ? round1(perfRecords.reduce((s, p) => s + p.kpiAchievementPct, 0) / perfRecords.length)
      : 0;

  const avgTenureMonths =
    employees.length > 0
      ? round1(employees.reduce((s, e) => s + e.tenureMonths, 0) / employees.length)
      : 0;

  const totalLeaveDays = dataset.leaveRecords
    .filter((l) => empIds.has(l.employeeId) && monthSet.has(l.monthKey))
    .reduce((s, l) => s + l.daysTaken, 0);

  return {
    totalHistoricalEmployees: employees.length,
    activeEmployees,
    exitedEmployees,
    newHiresInPeriod,
    turnoverRatePct,
    retentionRatePct,
    avgAttendanceRatePct,
    avgPerformanceScore,
    avgKpiAchievementPct,
    avgTenureMonths,
    lateArrivalRatePct,
    totalLeaveDays,
  };
}

export function computeMonthlyWorkforceTrends(
  filters: GlobalFilters,
  dataset: HrDataset = HR_DATASET
): MonthlyWorkforcePoint[] {
  const employees = getFilteredEmployees(filters, dataset);
  const empIds = new Set(employees.map((e) => e.employeeId));
  const monthKeys = getFilteredMonthKeys(filters.horizonMonths, dataset);

  // Build quarter lookup for performance
  const quarterByMonth = new Map<string, string>();
  const labelByMonth = new Map<string, string>();
  dataset.dateDimension.forEach((d) => {
    quarterByMonth.set(d.monthKey, d.quarter);
    labelByMonth.set(d.monthKey, d.monthLabel);
  });

  return monthKeys.map((monthKey) => {
    const headcount = employees.filter((e) => {
      const hireM = e.hireDate.slice(0, 7);
      const exitM = e.exitDate ? e.exitDate.slice(0, 7) : null;
      return hireM <= monthKey && (!exitM || exitM >= monthKey);
    }).length;

    const newHires = employees.filter((e) => e.hireDate.slice(0, 7) === monthKey).length;
    const exits = dataset.turnoverEvents.filter(
      (t) => empIds.has(t.employeeId) && t.monthKey === monthKey
    ).length;

    const turnoverRatePct = headcount > 0 ? round2((exits / headcount) * 100) : 0;

    const attRows = dataset.attendanceMonthly.filter(
      (a) => empIds.has(a.employeeId) && a.monthKey === monthKey
    );
    const totalAvail = attRows.reduce((s, r) => s + Math.max(1, r.workingDays - r.leaveDays), 0);
    const totalPres = attRows.reduce((s, r) => s + r.presentDays, 0);
    const totalLate = attRows.reduce((s, r) => s + r.lateArrivals, 0);

    const attendanceRatePct = totalAvail > 0 ? round1((totalPres / totalAvail) * 100) : 0;
    const lateRatePct = totalPres > 0 ? round1((totalLate / totalPres) * 100) : 0;

    const q = quarterByMonth.get(monthKey) ?? '';
    const perfRows = dataset.performanceReviews.filter(
      (p) => empIds.has(p.employeeId) && p.reviewPeriod === q
    );
    const avgPerformance =
      perfRows.length > 0
        ? round2(perfRows.reduce((s, p) => s + p.ratingScore, 0) / perfRows.length)
        : 3.6;
    const avgKpiPct =
      perfRows.length > 0
        ? round1(perfRows.reduce((s, p) => s + p.kpiAchievementPct, 0) / perfRows.length)
        : 88;

    return {
      monthKey,
      monthLabel: labelByMonth.get(monthKey) ?? monthKey,
      headcount,
      newHires,
      exits,
      turnoverRatePct,
      attendanceRatePct,
      lateRatePct,
      avgPerformance,
      avgKpiPct,
    };
  });
}

export function computeDepartmentRollups(
  filters: GlobalFilters,
  dataset: HrDataset = HR_DATASET
): DepartmentRollup[] {
  const monthKeys = getFilteredMonthKeys(filters.horizonMonths, dataset);
  const monthSet = new Set(monthKeys);
  const firstMonthKey = monthKeys[0];
  const quarterSet = new Set(
    dataset.dateDimension.filter((d) => monthSet.has(d.monthKey)).map((d) => d.quarter)
  );
  const periodFactor = 12 / filters.horizonMonths;

  return dataset.departments
    .filter((d) => filters.departmentId === 'ALL' || d.departmentId === filters.departmentId)
    .map((dept) => {
      const deptEmps = dataset.employees.filter((e) => {
        if (e.departmentId !== dept.departmentId) return false;
        if (filters.workMode !== 'ALL' && e.workMode !== filters.workMode) return false;
        return true;
      });
      const empIds = new Set(deptEmps.map((e) => e.employeeId));
      const activeCount = deptEmps.filter((e) => e.status === 'Active').length;
      const newHiresCount = deptEmps.filter((e) => e.hireDate.slice(0, 7) >= firstMonthKey).length;
      const exitedCount = dataset.turnoverEvents.filter(
        (t) => empIds.has(t.employeeId) && monthSet.has(t.monthKey)
      ).length;

      const avgHc = Math.max(1, activeCount + exitedCount * 0.5);
      const turnoverRatePct = round1(((exitedCount * periodFactor) / avgHc) * 100);
      const retentionRatePct = round1(Math.max(0, 100 - turnoverRatePct));

      const attRows = dataset.attendanceMonthly.filter(
        (a) => empIds.has(a.employeeId) && monthSet.has(a.monthKey)
      );
      const avail = attRows.reduce((s, r) => s + Math.max(1, r.workingDays - r.leaveDays), 0);
      const pres = attRows.reduce((s, r) => s + r.presentDays, 0);
      const late = attRows.reduce((s, r) => s + r.lateArrivals, 0);

      const avgAttendancePct = avail > 0 ? round1((pres / avail) * 100) : 0;
      const lateArrivalRatePct = pres > 0 ? round1((late / pres) * 100) : 0;

      const perfRows = dataset.performanceReviews.filter(
        (p) => empIds.has(p.employeeId) && quarterSet.has(p.reviewPeriod)
      );
      const avgPerformanceScore =
        perfRows.length > 0
          ? round2(perfRows.reduce((s, p) => s + p.ratingScore, 0) / perfRows.length)
          : 0;
      const avgKpiPct =
        perfRows.length > 0
          ? round1(perfRows.reduce((s, p) => s + p.kpiAchievementPct, 0) / perfRows.length)
          : 0;

      const avgTenureMonths =
        deptEmps.length > 0
          ? round1(deptEmps.reduce((s, e) => s + e.tenureMonths, 0) / deptEmps.length)
          : 0;

      const totalLeaveDays = dataset.leaveRecords
        .filter((l) => empIds.has(l.employeeId) && monthSet.has(l.monthKey))
        .reduce((s, l) => s + l.daysTaken, 0);

      return {
        departmentId: dept.departmentId,
        departmentName: dept.departmentName,
        costCenter: dept.costCenter,
        targetHeadcount: dept.targetHeadcount,
        activeCount,
        exitedCount,
        newHiresCount,
        turnoverRatePct,
        retentionRatePct,
        avgAttendancePct,
        lateArrivalRatePct,
        avgPerformanceScore,
        avgKpiPct,
        avgTenureMonths,
        headcountVariance: activeCount - dept.targetHeadcount,
        totalLeaveDays,
      };
    });
}

export function computePerformanceDistribution(
  filters: GlobalFilters,
  dataset: HrDataset = HR_DATASET
) {
  const employees = getFilteredEmployees(filters, dataset);
  const empIds = new Set(employees.map((e) => e.employeeId));
  const monthSet = new Set(getFilteredMonthKeys(filters.horizonMonths, dataset));
  const quarterSet = new Set(
    dataset.dateDimension.filter((d) => monthSet.has(d.monthKey)).map((d) => d.quarter)
  );

  // Use latest review per employee within filtered quarters
  const latestByEmp = new Map<string, { rating: number; kpi: number; prod: number }>();
  for (const rev of dataset.performanceReviews) {
    if (!empIds.has(rev.employeeId) || !quarterSet.has(rev.reviewPeriod)) continue;
    latestByEmp.set(rev.employeeId, {
      rating: rev.ratingScore,
      kpi: rev.kpiAchievementPct,
      prod: rev.productivityIndex,
    });
  }

  const buckets = [
    { label: 'Exceeds (4.5 - 5.0)', min: 4.5, max: 5.1, count: 0 },
    { label: 'Strong (3.8 - 4.4)', min: 3.8, max: 4.5, count: 0 },
    { label: 'Meets (3.0 - 3.7)', min: 3.0, max: 3.8, count: 0 },
    { label: 'Developing (2.2 - 2.9)', min: 2.2, max: 3.0, count: 0 },
    { label: 'Below Target (< 2.2)', min: 0, max: 2.2, count: 0 },
  ];

  latestByEmp.forEach((v) => {
    const b = buckets.find((bk) => v.rating >= bk.min && v.rating < bk.max);
    if (b) b.count += 1;
  });

  // Quarterly performance trend across all 8 quarters for filtered employees
  const quarters = ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'];
  const quarterlyTrend = quarters.map((q) => {
    const rows = dataset.performanceReviews.filter(
      (r) => empIds.has(r.employeeId) && r.reviewPeriod === q
    );
    return {
      quarter: q,
      avgRating: rows.length ? round2(rows.reduce((s, r) => s + r.ratingScore, 0) / rows.length) : 0,
      avgKpi: rows.length ? round1(rows.reduce((s, r) => s + r.kpiAchievementPct, 0) / rows.length) : 0,
      avgProductivity: rows.length ? round1(rows.reduce((s, r) => s + r.productivityIndex, 0) / rows.length) : 0,
      reviewsCount: rows.length,
    };
  });

  return { buckets, quarterlyTrend };
}

export function computeLeaveBreakdown(
  filters: GlobalFilters,
  dataset: HrDataset = HR_DATASET
) {
  const employees = getFilteredEmployees(filters, dataset);
  const empIds = new Set(employees.map((e) => e.employeeId));
  const monthSet = new Set(getFilteredMonthKeys(filters.horizonMonths, dataset));

  const map = new Map<string, { days: number; count: number }>();
  for (const rec of dataset.leaveRecords) {
    if (!empIds.has(rec.employeeId) || !monthSet.has(rec.monthKey)) continue;
    const prev = map.get(rec.leaveType) ?? { days: 0, count: 0 };
    map.set(rec.leaveType, { days: prev.days + rec.daysTaken, count: prev.count + 1 });
  }

  return Array.from(map.entries()).map(([leaveType, v]) => ({
    leaveType,
    days: v.days,
    requests: v.count,
  }));
}

export function computeTurnoverBreakdown(
  filters: GlobalFilters,
  dataset: HrDataset = HR_DATASET
) {
  const employees = getFilteredEmployees(filters, dataset);
  const empIds = new Set(employees.map((e) => e.employeeId));
  const monthSet = new Set(getFilteredMonthKeys(filters.horizonMonths, dataset));

  const events = dataset.turnoverEvents.filter(
    (t) => empIds.has(t.employeeId) && monthSet.has(t.monthKey)
  );

  const byType = new Map<string, number>();
  const byReason = new Map<string, number>();
  const tenureBuckets = [
    { label: '< 12 mo', count: 0 },
    { label: '12 - 24 mo', count: 0 },
    { label: '25 - 48 mo', count: 0 },
    { label: '48+ mo', count: 0 },
  ];

  for (const ev of events) {
    byType.set(ev.exitType, (byType.get(ev.exitType) ?? 0) + 1);
    byReason.set(ev.exitReason, (byReason.get(ev.exitReason) ?? 0) + 1);
    if (ev.tenureMonths < 12) tenureBuckets[0].count += 1;
    else if (ev.tenureMonths <= 24) tenureBuckets[1].count += 1;
    else if (ev.tenureMonths <= 48) tenureBuckets[2].count += 1;
    else tenureBuckets[3].count += 1;
  }

  return {
    events,
    byType: Array.from(byType.entries()).map(([label, value]) => ({ label, value })),
    byReason: Array.from(byReason.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    tenureBuckets,
  };
}
