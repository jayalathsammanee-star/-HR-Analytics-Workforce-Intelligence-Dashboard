import {
  DailyAttendanceCell,
  DateDimensionRow,
  Department,
  Employee,
  ExitType,
  LeaveRecord,
  LeaveType,
  MonthlyAttendanceRecord,
  PerformanceReview,
  TurnoverEvent,
  WorkMode,
} from '../types/hr';

// Deterministic PRNG (Mulberry32) so all metrics and ML splits are reproducible
function createRng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

export const DEPARTMENTS: Department[] = [
  {
    departmentId: 'DEPT-ENG',
    departmentName: 'Engineering',
    costCenter: 'CC-101',
    targetHeadcount: 92,
    annualBudgetUsd: 11850000,
    leadTitle: 'VP of Engineering',
  },
  {
    departmentId: 'DEPT-SLS',
    departmentName: 'Sales & Revenue',
    costCenter: 'CC-204',
    targetHeadcount: 68,
    annualBudgetUsd: 7420000,
    leadTitle: 'VP of Global Sales',
  },
  {
    departmentId: 'DEPT-PRD',
    departmentName: 'Product & Design',
    costCenter: 'CC-108',
    targetHeadcount: 42,
    annualBudgetUsd: 5180000,
    leadTitle: 'Chief Product Officer',
  },
  {
    departmentId: 'DEPT-CSX',
    departmentName: 'Customer Success',
    costCenter: 'CC-302',
    targetHeadcount: 54,
    annualBudgetUsd: 4320000,
    leadTitle: 'Director of Client Operations',
  },
  {
    departmentId: 'DEPT-FIN',
    departmentName: 'Finance & Legal',
    costCenter: 'CC-401',
    targetHeadcount: 28,
    annualBudgetUsd: 3290000,
    leadTitle: 'Chief Financial Officer',
  },
  {
    departmentId: 'DEPT-PPL',
    departmentName: 'People & Operations',
    costCenter: 'CC-501',
    targetHeadcount: 24,
    annualBudgetUsd: 2460000,
    leadTitle: 'Chief People Officer',
  },
];

const FIRST_NAMES = [
  'Maya', 'Daniel', 'Priya', 'Lucas', 'Hannah', 'Mateo', 'Sophia', 'Ethan',
  'Amara', 'Noah', 'Elena', 'Liam', 'Nadia', 'Oliver', 'Zara', 'Caleb',
  'Aria', 'Samuel', 'Claire', 'Julian', 'Mei', 'Benjamin', 'Talia', 'Owen',
  'Noor', 'Gabriel', 'Sienna', 'Victor', 'Leila', 'Adrian', 'Kira', 'Marcus',
  'Chloe', 'Isaac', 'Rhea', 'Sebastian', 'Camille', 'Aiden', 'Yuki', 'Thomas',
];

const LAST_NAMES = [
  'Patel', 'Mercer', 'Chen', 'Alvarez', 'Kowalski', 'Bennett', 'Okafor', 'Lindqvist',
  'Takahashi', 'Morales', 'Gallagher', 'Siddiqui', 'Vance', 'Reyes', 'Novak', 'Brooks',
  'Kulkarni', 'Foster', 'Duval', 'Kim', 'Sato', 'Delgado', 'Wallace', 'Rahman',
  'Sinclair', 'Bauer', 'Mendez', 'Park', 'Ferreira', 'Holloway', 'Haddad', 'Zhang',
];

const ROLES_BY_DEPT: Record<string, string[]> = {
  'DEPT-ENG': ['Staff Software Engineer', 'Senior Backend Engineer', 'Frontend Engineer', 'Data Platform Engineer', 'DevOps Specialist', 'QA Automation Lead'],
  'DEPT-SLS': ['Enterprise Account Executive', 'Sales Development Rep', 'Regional Sales Manager', 'Solutions Consultant', 'Revenue Operations Analyst'],
  'DEPT-PRD': ['Senior Product Manager', 'Principal UX Designer', 'Product Researcher', 'Design Systems Lead', 'Technical Product Analyst'],
  'DEPT-CSX': ['Customer Success Manager', 'Implementation Specialist', 'Technical Account Manager', 'Support Team Lead', 'Onboarding Analyst'],
  'DEPT-FIN': ['Senior Financial Analyst', 'Corporate Counsel', 'Payroll & Tax Lead', 'Compliance Specialist', 'FP&A Manager'],
  'DEPT-PPL': ['HR Business Partner', 'Talent Acquisition Lead', 'People Analytics Specialist', 'Learning & Development Coord', 'Workplace Ops Manager'],
};

const EXIT_REASONS_VOLUNTARY = [
  'Career Progression Opportunity',
  'Workload & Overtime Strain',
  'Compensation Alignment',
  'Relocation / Commute',
  'Role Scope Mismatch',
];

const EXIT_REASONS_INVOLUNTARY = [
  'Performance Improvement Plan Closure',
  'Role Restructuring',
  'Contract Completion',
];

// 24 months: Dec 2024 (index 0) -> Nov 2026 (index 23)
export const DATE_DIMENSION: DateDimensionRow[] = (() => {
  const rows: DateDimensionRow[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let year = 2024;
  let month = 12; // 1-12
  for (let i = 0; i < 24; i++) {
    const mm = String(month).padStart(2, '0');
    const q = Math.ceil(month / 3);
    rows.push({
      monthKey: `${year}-${mm}`,
      monthLabel: `${monthNames[month - 1]} ${String(year).slice(2)}`,
      quarter: `${year}-Q${q}`,
      year,
      monthOrder: i,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return rows;
})();

const QUARTERS = ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'];

export interface HrDataset {
  departments: Department[];
  employees: Employee[];
  attendanceMonthly: MonthlyAttendanceRecord[];
  dailyAttendanceMatrix: DailyAttendanceCell[];
  performanceReviews: PerformanceReview[];
  leaveRecords: LeaveRecord[];
  turnoverEvents: TurnoverEvent[];
  dateDimension: DateDimensionRow[];
}

export function buildSyntheticHrDataset(): HrDataset {
  const rng = createRng(20261122);
  const employees: Employee[] = [];
  const attendanceMonthly: MonthlyAttendanceRecord[] = [];
  const performanceReviews: PerformanceReview[] = [];
  const leaveRecords: LeaveRecord[] = [];
  const turnoverEvents: TurnoverEvent[] = [];

  // Target total cohort ~340 records across 24 months (approx 295 active, ~45 exited)
  const deptCounts: Record<string, number> = {
    'DEPT-ENG': 102,
    'DEPT-SLS': 78,
    'DEPT-PRD': 46,
    'DEPT-CSX': 60,
    'DEPT-FIN': 30,
    'DEPT-PPL': 26,
  };

  let empSeq = 1001;
  let attSeq = 1;
  let revSeq = 1;
  let leaveSeq = 1;
  let turnSeq = 1;

  const refYear = 2026;
  const refMonth = 11; // Nov 2026

  const monthIndexFromKey = (key: string) => DATE_DIMENSION.findIndex((d) => d.monthKey === key);

  const deptBaseRisk: Record<string, number> = {
    'DEPT-ENG': 0.08,
    'DEPT-SLS': 0.19,
    'DEPT-PRD': 0.09,
    'DEPT-CSX': 0.16,
    'DEPT-FIN': 0.07,
    'DEPT-PPL': 0.06,
  };

  const deptBaseSalary: Record<string, number> = {
    'DEPT-ENG': 134000,
    'DEPT-SLS': 105000,
    'DEPT-PRD': 122000,
    'DEPT-CSX': 84000,
    'DEPT-FIN': 112000,
    'DEPT-PPL': 96000,
  };

  for (const dept of DEPARTMENTS) {
    const count = deptCounts[dept.departmentId];
    const roles = ROLES_BY_DEPT[dept.departmentId];

    for (let i = 0; i < count; i++) {
      const employeeId = `EMP-${empSeq++}`;
      const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
      const last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
      const fullName = `${first} ${last}`;
      const roleTitle = roles[Math.floor(rng() * roles.length)];

      // Hire date between 2021-02 and 2026-09
      const hireMonthsAgo = Math.floor(2 + rng() * 66);
      const totalHireMonths = refYear * 12 + (refMonth - 1) - hireMonthsAgo;
      const hireY = Math.floor(totalHireMonths / 12);
      const hireM = (totalHireMonths % 12) + 1;
      const hireD = Math.min(28, 1 + Math.floor(rng() * 27));
      const hireDate = `${hireY}-${String(hireM).padStart(2, '0')}-${String(hireD).padStart(2, '0')}`;
      const hireMonthKey = `${hireY}-${String(hireM).padStart(2, '0')}`;

      const workModeRoll = rng();
      const workMode: WorkMode =
        dept.departmentId === 'DEPT-ENG' || dept.departmentId === 'DEPT-PRD'
          ? workModeRoll < 0.56
            ? 'Hybrid'
            : workModeRoll < 0.88
            ? 'Remote'
            : 'On-Site'
          : workModeRoll < 0.52
          ? 'Hybrid'
          : workModeRoll < 0.72
          ? 'Remote'
          : 'On-Site';

      const employmentType = rng() < 0.91 ? 'Full-Time' : 'Contract';
      const bands: Array<'L2' | 'L3' | 'L4' | 'L5' | 'L6'> = ['L2', 'L3', 'L4', 'L5', 'L6'];
      const bandIdx = Math.min(4, Math.floor(rng() * 4.5));
      const salaryBand = bands[bandIdx];
      const baseSalaryUsd = Math.round(deptBaseSalary[dept.departmentId] * (0.78 + bandIdx * 0.14 + rng() * 0.08));

      // Behavioral & workload attributes (no protected demographics)
      const engagementBaseline = clamp(0.45 + rng() * 0.52, 0.25, 0.98);
      const overtimeHoursAvg = round1(
        clamp(
          (dept.departmentId === 'DEPT-SLS' || dept.departmentId === 'DEPT-CSX' ? 11 : 7) +
            (rng() - 0.35) * 18 +
            (engagementBaseline < 0.52 ? 8 : 0),
          0,
          38
        )
      );
      const commuteDistanceKm = workMode === 'Remote' ? round1(rng() * 5) : round1(4 + rng() * 48);
      const trainingHoursYtd = Math.round(clamp(8 + engagementBaseline * 34 + (rng() - 0.5) * 16, 2, 64));
      const promotionLast2Yr = hireMonthsAgo >= 14 && engagementBaseline > 0.64 && rng() < 0.42;

      // Determine exit probability driven by realistic work-strain & engagement signals
      const strainLogit =
        -2.75 +
        deptBaseRisk[dept.departmentId] * 3.1 +
        (overtimeHoursAvg - 11) * 0.085 +
        (0.65 - engagementBaseline) * 3.4 +
        (commuteDistanceKm > 32 && workMode === 'On-Site' ? 0.65 : 0) -
        (promotionLast2Yr ? 0.85 : 0) -
        (trainingHoursYtd > 28 ? 0.45 : 0) +
        (hireMonthsAgo < 18 ? 0.38 : -0.25);

      const exitProb = 1 / (1 + Math.exp(-strainLogit));
      const didExit = hireMonthsAgo > 3 && rng() < exitProb;

      let exitDate: string | null = null;
      let exitMonthKey: string | null = null;
      let status: 'Active' | 'Exited' = 'Active';

      if (didExit) {
        // Exit inside the 24-month observation window (Dec 2024 - Nov 2026)
        const earliestExitIdx = Math.max(0, monthIndexFromKey(hireMonthKey) + 2);
        if (earliestExitIdx <= 23) {
          const exitIdx = earliestExitIdx + Math.floor(rng() * (24 - earliestExitIdx));
          const exitMonthObj = DATE_DIMENSION[exitIdx];
          const exitD = Math.min(28, 3 + Math.floor(rng() * 24));
          exitDate = `${exitMonthObj.monthKey}-${String(exitD).padStart(2, '0')}`;
          exitMonthKey = exitMonthObj.monthKey;
          status = 'Exited';
        }
      }

      const tenureMonths = exitDate
        ? Math.max(2, monthIndexFromKey(exitDate.slice(0, 7)) - (monthIndexFromKey(hireMonthKey) < 0 ? -Math.max(1, hireMonthsAgo - 24) : monthIndexFromKey(hireMonthKey)))
        : hireMonthsAgo;

      const emp: Employee = {
        employeeId,
        fullName,
        roleTitle,
        departmentId: dept.departmentId,
        departmentName: dept.departmentName,
        employmentType,
        workMode,
        hireDate,
        exitDate,
        status,
        salaryBand,
        baseSalaryUsd,
        tenureMonths: Math.max(1, tenureMonths),
        overtimeHoursAvg,
        commuteDistanceKm,
        trainingHoursYtd,
        promotionLast2Yr,
        engagementBaseline: round2(engagementBaseline),
      };
      employees.push(emp);

      // Generate monthly attendance records for months employee was active inside 24-month window
      const startWindowIdx = Math.max(0, hireMonthKey < '2024-12' ? 0 : monthIndexFromKey(hireMonthKey));
      const endWindowIdx = exitMonthKey ? monthIndexFromKey(exitMonthKey) : 23;

      let latestRating = 3.5;

      for (let mIdx = startWindowIdx; mIdx <= endWindowIdx; mIdx++) {
        if (mIdx < 0 || mIdx >= DATE_DIMENSION.length) continue;
        const dRow = DATE_DIMENSION[mIdx];
        const workingDays = 21 + ((mIdx % 3 === 0) ? 1 : 0);

        // Seasonal dip in Dec/Jan and Jul/Aug + strain effect before exit
        const nearExitPenalty = exitMonthKey && endWindowIdx - mIdx <= 2 ? 0.045 : 0;
        const seasonalDip = dRow.monthKey.endsWith('-12') || dRow.monthKey.endsWith('-08') ? 0.015 : 0;
        const expectedAttendance = clamp(
          0.915 + (engagementBaseline - 0.65) * 0.08 - (overtimeHoursAvg > 20 ? 0.025 : 0) - nearExitPenalty - seasonalDip,
          0.74,
          0.995
        );

        const absentDays = Math.min(
          5,
          Math.max(0, Math.round((1 - expectedAttendance) * workingDays * (0.55 + rng() * 0.85)))
        );
        const leaveDays = rng() < 0.24 ? (rng() < 0.7 ? 1 : 2) : 0;
        const presentDays = Math.max(12, workingDays - absentDays - leaveDays);
        const lateBase = (1 - engagementBaseline) * 2.8 + (commuteDistanceKm > 28 && workMode !== 'Remote' ? 1.1 : 0.2) + nearExitPenalty * 25;
        const lateArrivals = Math.min(presentDays, Math.max(0, Math.round(lateBase * (0.4 + rng() * 1.1))));
        const remoteDays =
          workMode === 'Remote'
            ? presentDays
            : workMode === 'Hybrid'
            ? Math.round(presentDays * (0.4 + rng() * 0.15))
            : Math.round(presentDays * 0.05);

        const attendanceRatePct = round1((presentDays / Math.max(1, workingDays - leaveDays)) * 100);

        attendanceMonthly.push({
          attendanceId: `ATT-${attSeq++}`,
          employeeId,
          departmentId: dept.departmentId,
          monthKey: dRow.monthKey,
          workingDays,
          presentDays,
          absentDays,
          lateArrivals,
          remoteDays,
          leaveDays,
          attendanceRatePct,
        });

        if (leaveDays > 0) {
          const leaveTypes: LeaveType[] = ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Parental Leave'];
          const ltRoll = rng();
          const leaveType: LeaveType =
            ltRoll < 0.56 ? 'Annual Leave' : ltRoll < 0.84 ? 'Sick Leave' : ltRoll < 0.96 ? 'Personal Leave' : 'Parental Leave';
          leaveRecords.push({
            leaveId: `LVE-${leaveSeq++}`,
            employeeId,
            departmentId: dept.departmentId,
            leaveType,
            monthKey: dRow.monthKey,
            startDate: `${dRow.monthKey}-${String(5 + Math.floor(rng() * 18)).padStart(2, '0')}`,
            daysTaken: leaveDays,
            approved: true,
          });
        }
      }

      // Generate quarterly performance reviews across 2025-Q1..2026-Q4 while active
      for (let qIdx = 0; qIdx < QUARTERS.length; qIdx++) {
        const qName = QUARTERS[qIdx];
        const qEndMonthIdx = 3 + qIdx * 3; // 2025-Q1 ends Mar 25 (idx 3) .. 2026-Q4 ends Nov 26 (idx 23)
        const clampedQEnd = Math.min(23, qEndMonthIdx);
        if (startWindowIdx > clampedQEnd || endWindowIdx < clampedQEnd - 2) continue;

        const baseRating = 2.75 + engagementBaseline * 1.95 + (promotionLast2Yr ? 0.2 : 0) - (overtimeHoursAvg > 25 ? 0.25 : 0);
        const trendBoost = qIdx * 0.025;
        const ratingScore = round2(clamp(baseRating + trendBoost + (rng() - 0.5) * 0.65, 1.5, 5.0));
        latestRating = ratingScore;

        const kpiAchievementPct = round1(clamp(62 + (ratingScore - 2.0) * 18 + (rng() - 0.5) * 12, 48, 118));
        const productivityIndex = round1(clamp(68 + (ratingScore - 2.2) * 15 + (rng() - 0.5) * 10, 52, 114));
        const goalsTotal = 5 + Math.floor(rng() * 3);
        const goalsMet = Math.min(goalsTotal, Math.max(1, Math.round((kpiAchievementPct / 100) * goalsTotal)));
        const peerFeedbackScore = round2(clamp(ratingScore + (rng() - 0.5) * 0.45, 1.8, 5.0));

        performanceReviews.push({
          reviewId: `REV-${revSeq++}`,
          employeeId,
          departmentId: dept.departmentId,
          reviewPeriod: qName,
          periodOrder: qIdx,
          ratingScore,
          kpiAchievementPct,
          productivityIndex,
          goalsMet,
          goalsTotal,
          peerFeedbackScore,
        });
      }

      if (status === 'Exited' && exitDate && exitMonthKey) {
        const exitRoll = rng();
        const exitType: ExitType =
          exitRoll < 0.74 ? 'Voluntary' : exitRoll < 0.94 ? 'Involuntary' : 'Retirement';
        const exitReason =
          exitType === 'Voluntary'
            ? overtimeHoursAvg > 18
              ? 'Workload & Overtime Strain'
              : EXIT_REASONS_VOLUNTARY[Math.floor(rng() * EXIT_REASONS_VOLUNTARY.length)]
            : exitType === 'Involuntary'
            ? EXIT_REASONS_INVOLUNTARY[Math.floor(rng() * EXIT_REASONS_INVOLUNTARY.length)]
            : 'Planned Retirement';

        turnoverEvents.push({
          turnoverId: `TRN-${turnSeq++}`,
          employeeId,
          departmentId: dept.departmentId,
          departmentName: dept.departmentName,
          exitDate,
          monthKey: exitMonthKey,
          exitType,
          exitReason,
          tenureMonths: emp.tenureMonths,
          lastPerformanceScore: latestRating,
        });
      }
    }
  }

  // Generate 15-workday daily attendance heatmap matrix (Nov 2026) from active employees per dept
  const dailyAttendanceMatrix: DailyAttendanceCell[] = [];
  const dayLabels = [
    'Nov 02', 'Nov 03', 'Nov 04', 'Nov 05', 'Nov 06',
    'Nov 09', 'Nov 10', 'Nov 11', 'Nov 12', 'Nov 13',
    'Nov 16', 'Nov 17', 'Nov 18', 'Nov 19', 'Nov 20',
  ];

  for (const dept of DEPARTMENTS) {
    const activeInDept = employees.filter((e) => e.departmentId === dept.departmentId && e.status === 'Active');
    const deptAttNov = attendanceMonthly.filter(
      (a) => a.departmentId === dept.departmentId && a.monthKey === '2026-11'
    );
    const baseDeptRate =
      deptAttNov.length > 0
        ? deptAttNov.reduce((s, r) => s + r.attendanceRatePct, 0) / deptAttNov.length
        : 93;

    for (let dIdx = 0; dIdx < dayLabels.length; dIdx++) {
      // Realistic Monday/Friday subtle variance
      const dayOfWeek = dIdx % 5; // 0=Mon, 4=Fri
      const dowAdj = dayOfWeek === 0 ? -1.1 : dayOfWeek === 4 ? -1.8 : 0.7;
      const noise = (rng() - 0.5) * 3.4;
      const rate = clamp(baseDeptRate + dowAdj + noise, 82, 99.2);
      const totalActive = activeInDept.length;
      const presentCount = Math.min(totalActive, Math.round((rate / 100) * totalActive));
      const absentCount = totalActive - presentCount;
      const lateCount = Math.max(0, Math.round(presentCount * (0.02 + rng() * 0.045)));

      dailyAttendanceMatrix.push({
        departmentId: dept.departmentId,
        departmentName: dept.departmentName,
        dayLabel: dayLabels[dIdx],
        dayIndex: dIdx,
        presentCount,
        totalActive,
        attendanceRatePct: round1((presentCount / Math.max(1, totalActive)) * 100),
        lateCount,
        absentCount,
      });
    }
  }

  return {
    departments: DEPARTMENTS,
    employees,
    attendanceMonthly,
    dailyAttendanceMatrix,
    performanceReviews,
    leaveRecords,
    turnoverEvents,
    dateDimension: DATE_DIMENSION,
  };
}

export const HR_DATASET: HrDataset = buildSyntheticHrDataset();

export interface CustomSampleInput {
  fullName: string;
  departmentId: string;
  roleTitle: string;
  workMode: WorkMode;
  overtimeHoursAvg: number;
  attendanceTargetPct: number;
  ratingScore: number;
  kpiAchievementPct: number;
  trainingHoursYtd: number;
  promotionLast2Yr: boolean;
  status: 'Active' | 'Exited';
}

export function appendCustomSampleEmployee(
  dataset: HrDataset,
  input: CustomSampleInput
): HrDataset {
  const dept = dataset.departments.find((d) => d.departmentId === input.departmentId) ?? dataset.departments[0];
  const nextEmpNum = 1001 + dataset.employees.length;
  const employeeId = `EMP-${nextEmpNum}`;
  const isExited = input.status === 'Exited';
  const tenureMonths = 14;
  const hireDate = '2025-09-10';
  const exitDate = isExited ? '2026-11-12' : null;

  const newEmp: Employee = {
    employeeId,
    fullName: input.fullName.trim() || `Sample Analyst ${nextEmpNum}`,
    roleTitle: input.roleTitle.trim() || ROLES_BY_DEPT[dept.departmentId][0],
    departmentId: dept.departmentId,
    departmentName: dept.departmentName,
    employmentType: 'Full-Time',
    workMode: input.workMode,
    hireDate,
    exitDate,
    status: input.status,
    salaryBand: 'L4',
    baseSalaryUsd: 108000,
    tenureMonths,
    overtimeHoursAvg: round1(clamp(input.overtimeHoursAvg, 0, 40)),
    commuteDistanceKm: input.workMode === 'Remote' ? 0 : 18,
    trainingHoursYtd: Math.round(clamp(input.trainingHoursYtd, 0, 80)),
    promotionLast2Yr: input.promotionLast2Yr,
    engagementBaseline: round2(clamp(input.ratingScore / 5, 0.25, 0.98)),
  };

  // Generate 12 months of attendance matching target attendance %
  const newAttendance: MonthlyAttendanceRecord[] = [];
  let attIdx = dataset.attendanceMonthly.length + 1;
  const monthsSlice = DATE_DIMENSION.slice(-12);
  for (const dRow of monthsSlice) {
    const workingDays = 21;
    const leaveDays = dRow.monthKey.endsWith('-07') ? 2 : 0;
    const avail = workingDays - leaveDays;
    const presentDays = Math.max(10, Math.min(avail, Math.round((input.attendanceTargetPct / 100) * avail)));
    const absentDays = Math.max(0, avail - presentDays);
    const lateArrivals = input.attendanceTargetPct < 88 ? 3 : input.attendanceTargetPct < 93 ? 1 : 0;
    newAttendance.push({
      attendanceId: `ATT-${attIdx++}`,
      employeeId,
      departmentId: dept.departmentId,
      monthKey: dRow.monthKey,
      workingDays,
      presentDays,
      absentDays,
      lateArrivals,
      remoteDays: input.workMode === 'Remote' ? presentDays : input.workMode === 'Hybrid' ? Math.round(presentDays * 0.5) : 1,
      leaveDays,
      attendanceRatePct: round1((presentDays / Math.max(1, avail)) * 100),
    });
  }

  // Generate last 4 quarterly performance reviews
  const newReviews: PerformanceReview[] = [];
  let revIdx = dataset.performanceReviews.length + 1;
  const recentQs = ['2026-Q1', '2026-Q2', '2026-Q3', '2026-Q4'];
  recentQs.forEach((q, idx) => {
    newReviews.push({
      reviewId: `REV-${revIdx++}`,
      employeeId,
      departmentId: dept.departmentId,
      reviewPeriod: q,
      periodOrder: 4 + idx,
      ratingScore: round2(clamp(input.ratingScore, 1, 5)),
      kpiAchievementPct: round1(clamp(input.kpiAchievementPct, 45, 120)),
      productivityIndex: round1(clamp(input.kpiAchievementPct * 0.96, 50, 115)),
      goalsMet: input.kpiAchievementPct >= 90 ? 5 : 3,
      goalsTotal: 5,
      peerFeedbackScore: round2(clamp(input.ratingScore + 0.1, 1, 5)),
    });
  });

  const newLeaves: LeaveRecord[] = [
    {
      leaveId: `LVE-${dataset.leaveRecords.length + 1}`,
      employeeId,
      departmentId: dept.departmentId,
      leaveType: 'Annual Leave',
      monthKey: '2026-07',
      startDate: '2026-07-14',
      daysTaken: 2,
      approved: true,
    },
  ];

  const newTurnover: TurnoverEvent[] = isExited
    ? [
        {
          turnoverId: `TRN-${dataset.turnoverEvents.length + 1}`,
          employeeId,
          departmentId: dept.departmentId,
          departmentName: dept.departmentName,
          exitDate: '2026-11-12',
          monthKey: '2026-11',
          exitType: 'Voluntary',
          exitReason: input.overtimeHoursAvg > 20 ? 'Workload & Overtime Strain' : 'Career Progression Opportunity',
          tenureMonths,
          lastPerformanceScore: round2(input.ratingScore),
        },
      ]
    : [];

  return {
    ...dataset,
    employees: [newEmp, ...dataset.employees],
    attendanceMonthly: [...dataset.attendanceMonthly, ...newAttendance],
    performanceReviews: [...dataset.performanceReviews, ...newReviews],
    leaveRecords: [...dataset.leaveRecords, ...newLeaves],
    turnoverEvents: [...dataset.turnoverEvents, ...newTurnover],
  };
}

export function appendSampleBatch(
  dataset: HrDataset,
  count: number,
  mode: 'balanced' | 'high-strain'
): HrDataset {
  let updated = dataset;
  const rng = createRng(Date.now() + dataset.employees.length * 97);

  for (let i = 0; i < count; i++) {
    const dept = DEPARTMENTS[Math.floor(rng() * DEPARTMENTS.length)];
    const roles = ROLES_BY_DEPT[dept.departmentId];
    const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
    const workModes: WorkMode[] = ['Hybrid', 'Remote', 'On-Site'];

    const isHighStrain = mode === 'high-strain';
    const overtime = isHighStrain ? round1(20 + rng() * 16) : round1(4 + rng() * 12);
    const attPct = isHighStrain ? round1(82 + rng() * 9) : round1(92 + rng() * 7);
    const rating = isHighStrain ? round2(2.4 + rng() * 1.3) : round2(3.5 + rng() * 1.3);
    const kpi = isHighStrain ? round1(66 + rng() * 20) : round1(86 + rng() * 22);
    const exited = isHighStrain ? rng() < 0.45 : rng() < 0.1;

    updated = appendCustomSampleEmployee(updated, {
      fullName: `${first} ${last}`,
      departmentId: dept.departmentId,
      roleTitle: roles[Math.floor(rng() * roles.length)],
      workMode: workModes[Math.floor(rng() * workModes.length)],
      overtimeHoursAvg: overtime,
      attendanceTargetPct: attPct,
      ratingScore: rating,
      kpiAchievementPct: kpi,
      trainingHoursYtd: isHighStrain ? Math.round(4 + rng() * 10) : Math.round(20 + rng() * 30),
      promotionLast2Yr: !isHighStrain && rng() < 0.45,
      status: exited ? 'Exited' : 'Active',
    });
  }

  return updated;
}

export function toCsvString<T extends object>(rows: T[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]) as Array<keyof T>;
  const escape = (val: unknown) => {
    const str = val === null || val === undefined ? '' : String(val);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
}

export function triggerCsvDownload(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
