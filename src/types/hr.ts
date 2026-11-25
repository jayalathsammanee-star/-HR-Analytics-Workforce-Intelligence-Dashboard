export type WorkMode = 'Hybrid' | 'On-Site' | 'Remote';
export type EmploymentStatus = 'Active' | 'Exited';
export type EmploymentType = 'Full-Time' | 'Contract';
export type ExitType = 'Voluntary' | 'Involuntary' | 'Retirement';
export type LeaveType = 'Annual Leave' | 'Sick Leave' | 'Personal Leave' | 'Parental Leave';

export interface Department {
  departmentId: string;
  departmentName: string;
  costCenter: string;
  targetHeadcount: number;
  annualBudgetUsd: number;
  leadTitle: string;
}

export interface Employee {
  employeeId: string;
  fullName: string;
  roleTitle: string;
  departmentId: string;
  departmentName: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  hireDate: string; // YYYY-MM-DD
  exitDate: string | null; // YYYY-MM-DD
  status: EmploymentStatus;
  salaryBand: 'L2' | 'L3' | 'L4' | 'L5' | 'L6';
  baseSalaryUsd: number;
  tenureMonths: number;
  overtimeHoursAvg: number; // monthly avg
  commuteDistanceKm: number;
  trainingHoursYtd: number;
  promotionLast2Yr: boolean;
  // Intrinsic behavioral propensity parameters (strictly non-demographic)
  engagementBaseline: number;
}

export interface MonthlyAttendanceRecord {
  attendanceId: string;
  employeeId: string;
  departmentId: string;
  monthKey: string; // YYYY-MM
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateArrivals: number;
  remoteDays: number;
  leaveDays: number;
  attendanceRatePct: number;
}

export interface DailyAttendanceCell {
  departmentId: string;
  departmentName: string;
  dayLabel: string; // Mon..Fri or Nov 01..Nov 20
  dayIndex: number;
  presentCount: number;
  totalActive: number;
  attendanceRatePct: number;
  lateCount: number;
  absentCount: number;
}

export interface PerformanceReview {
  reviewId: string;
  employeeId: string;
  departmentId: string;
  reviewPeriod: string; // e.g., 2025-Q1 .. 2026-Q4
  periodOrder: number;
  ratingScore: number; // 1.0 - 5.0
  kpiAchievementPct: number; // 45 - 120
  productivityIndex: number; // 50 - 115
  goalsMet: number;
  goalsTotal: number;
  peerFeedbackScore: number; // 1.0 - 5.0
}

export interface LeaveRecord {
  leaveId: string;
  employeeId: string;
  departmentId: string;
  leaveType: LeaveType;
  monthKey: string;
  startDate: string;
  daysTaken: number;
  approved: boolean;
}

export interface TurnoverEvent {
  turnoverId: string;
  employeeId: string;
  departmentId: string;
  departmentName: string;
  exitDate: string;
  monthKey: string;
  exitType: ExitType;
  exitReason: string;
  tenureMonths: number;
  lastPerformanceScore: number;
}

export interface DateDimensionRow {
  monthKey: string; // YYYY-MM
  monthLabel: string; // Dec 24
  quarter: string; // 2024-Q4
  year: number;
  monthOrder: number;
}

export interface GlobalFilters {
  departmentId: string; // 'ALL' or departmentId
  horizonMonths: 6 | 12 | 24;
  workMode: 'ALL' | WorkMode;
  searchQuery: string;
}

export interface ExecutiveKpis {
  totalHistoricalEmployees: number;
  activeEmployees: number;
  exitedEmployees: number;
  newHiresInPeriod: number;
  turnoverRatePct: number;
  retentionRatePct: number;
  avgAttendanceRatePct: number;
  avgPerformanceScore: number;
  avgKpiAchievementPct: number;
  avgTenureMonths: number;
  lateArrivalRatePct: number;
  totalLeaveDays: number;
}

export interface MonthlyWorkforcePoint {
  monthKey: string;
  monthLabel: string;
  headcount: number;
  newHires: number;
  exits: number;
  turnoverRatePct: number;
  attendanceRatePct: number;
  lateRatePct: number;
  avgPerformance: number;
  avgKpiPct: number;
}

export interface DepartmentRollup {
  departmentId: string;
  departmentName: string;
  costCenter: string;
  targetHeadcount: number;
  activeCount: number;
  exitedCount: number;
  newHiresCount: number;
  turnoverRatePct: number;
  retentionRatePct: number;
  avgAttendancePct: number;
  lateArrivalRatePct: number;
  avgPerformanceScore: number;
  avgKpiPct: number;
  avgTenureMonths: number;
  headcountVariance: number;
  totalLeaveDays: number;
}

export interface FeatureWeight {
  featureKey: string;
  label: string;
  weight: number; // standardized log-odds coefficient
  absImportancePct: number;
  direction: 'Increases Risk' | 'Reduces Risk';
}

export interface EmployeeRiskAssessment {
  employeeId: string;
  fullName: string;
  roleTitle: string;
  departmentId: string;
  departmentName: string;
  workMode: WorkMode;
  tenureMonths: number;
  avgAttendancePct: number;
  lateArrivalRatePct: number;
  latestPerformanceScore: number;
  kpiAchievementPct: number;
  overtimeHoursAvg: number;
  trainingHoursYtd: number;
  promotionLast2Yr: boolean;
  predictedRiskProb: number; // 0..1
  riskTier: 'High Risk' | 'Moderate Watch' | 'Low Risk';
  topDrivers: Array<{
    factor: string;
    impact: number; // contribution to log-odds
    detail: string;
  }>;
}

export interface LogisticModelEvaluation {
  sampleSize: number;
  trainSize: number;
  testSize: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  rocAuc: number;
  confusionMatrix: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
  };
  rocCurve: Array<{ fpr: number; tpr: number }>;
  featureWeights: FeatureWeight[];
  employeePredictions: EmployeeRiskAssessment[];
}

export interface ForecastPoint {
  monthKey: string;
  monthLabel: string;
  isForecast: boolean;
  actualHeadcount: number | null;
  predictedHeadcount: number;
  lowerBoundHeadcount: number;
  upperBoundHeadcount: number;
  actualTurnoverPct: number | null;
  predictedTurnoverPct: number;
  actualAttendancePct: number | null;
  predictedAttendancePct: number;
}

export interface ForecastModelSummary {
  headcountMetrics: { r2: number; mae: number; rmse: number; slopePerMonth: number };
  turnoverMetrics: { r2: number; mae: number; rmse: number; slopePerMonth: number };
  attendanceMetrics: { r2: number; mae: number; rmse: number; slopePerMonth: number };
  series: ForecastPoint[];
}

export interface WorkforceClusterPoint {
  employeeId: string;
  fullName: string;
  departmentName: string;
  attendanceRatePct: number;
  kpiAchievementPct: number;
  overtimeHoursAvg: number;
  lateArrivalRatePct: number;
  clusterId: 0 | 1 | 2;
  clusterLabel: string;
}

export interface ClusteringSummary {
  k: number;
  iterations: number;
  inertia: number;
  clusters: Array<{
    clusterId: 0 | 1 | 2;
    label: string;
    description: string;
    count: number;
    avgAttendancePct: number;
    avgKpiPct: number;
    avgOvertimeHrs: number;
    avgLatePct: number;
  }>;
  points: WorkforceClusterPoint[];
}
