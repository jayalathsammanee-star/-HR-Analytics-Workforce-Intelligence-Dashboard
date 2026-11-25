import React from 'react';
import { X, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { useHrData } from '../context/HrDataContext';
import { Employee, DepartmentRollup } from '../types/hr';
import { getAttritionModelEvaluation } from '../engine/mlModels';
import { MultiLineTrendChart, PALETTE } from './Charts';

export type DrillTarget =
  | { type: 'employee'; employee: Employee }
  | { type: 'department'; rollup: DepartmentRollup }
  | null;

interface DrillThroughDrawerProps {
  target: DrillTarget;
  onClose: () => void;
  onSelectEmployee: (emp: Employee) => void;
}

export const DrillThroughDrawer: React.FC<DrillThroughDrawerProps> = ({
  target,
  onClose,
  onSelectEmployee,
}) => {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#2A0A14]/40 backdrop-blur-[1px]">
      <div
        className="w-full max-w-xl bg-[#FAF7F2] h-full border-l border-[#E7DDD1] overflow-y-auto flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Drill-through detail view"
      >
        <div className="sticky top-0 z-10 bg-[#FFFDF9] border-b border-[#E7DDD1] px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs text-[#6E5A58] font-mono">
              {target.type === 'employee'
                ? `Employee Drill-Through · ${target.employee.employeeId}`
                : `Department Drill-Through · ${target.rollup.costCenter}`}
            </div>
            <h2 className="text-lg font-semibold text-[#2A1215] truncate font-display">
              {target.type === 'employee'
                ? target.employee.fullName
                : target.rollup.departmentName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#6E5A58] hover:text-[#2A1215] hover:bg-[#F3ECE2] transition-colors cursor-pointer"
            aria-label="Close drill-through drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {target.type === 'employee' ? (
            <EmployeeDrillContent employee={target.employee} />
          ) : (
            <DepartmentDrillContent
              rollup={target.rollup}
              onSelectEmployee={onSelectEmployee}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const EmployeeDrillContent: React.FC<{ employee: Employee }> = ({ employee }) => {
  const { dataset } = useHrData();
  const attRows = dataset.attendanceMonthly
    .filter((a) => a.employeeId === employee.employeeId)
    .slice(-12);

  const perfRows = dataset.performanceReviews.filter(
    (p) => p.employeeId === employee.employeeId
  );

  const leaveRows = dataset.leaveRecords.filter(
    (l) => l.employeeId === employee.employeeId
  );

  const turnoverEvent = dataset.turnoverEvents.find(
    (t) => t.employeeId === employee.employeeId
  );

  const mlEval = getAttritionModelEvaluation(undefined, dataset);
  const prediction = mlEval.employeePredictions.find(
    (p) => p.employeeId === employee.employeeId
  );

  return (
    <>
      {/* ACTUAL HR RECORD SECTION */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#5C162E]">Actual HR Record</h3>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              employee.status === 'Active'
                ? 'bg-[#2D6A4F]/10 text-[#2D6A4F]'
                : 'bg-[#9E1B32]/10 text-[#9E1B32]'
            }`}
          >
            {employee.status}
          </span>
        </div>

        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-4 grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-[#6E5A58]">Role & Department</div>
            <div className="font-medium text-[#2A1215] mt-0.5">{employee.roleTitle}</div>
            <div className="text-[#6E5A58]">{employee.departmentName}</div>
          </div>
          <div>
            <div className="text-[#6E5A58]">Work Mode & Band</div>
            <div className="font-medium text-[#2A1215] mt-0.5">
              {employee.workMode} · {employee.employmentType}
            </div>
            <div className="font-mono text-[#6E5A58]">
              Band {employee.salaryBand} · ${employee.baseSalaryUsd.toLocaleString()}/yr
            </div>
          </div>
          <div>
            <div className="text-[#6E5A58]">Hire Date & Tenure</div>
            <div className="font-mono tabular-nums font-medium text-[#2A1215] mt-0.5">
              {employee.hireDate} ({employee.tenureMonths} mo)
            </div>
          </div>
          <div>
            <div className="text-[#6E5A58]">Workload & Development</div>
            <div className="font-mono tabular-nums font-medium text-[#2A1215] mt-0.5">
              {employee.overtimeHoursAvg}h OT/mo · {employee.trainingHoursYtd}h training
            </div>
            <div className="text-[#6E5A58]">
              {employee.promotionLast2Yr ? 'Promoted within 24 mo' : 'No recent promotion'}
            </div>
          </div>
        </div>

        {turnoverEvent && (
          <div className="bg-[#9E1B32]/8 border border-[#9E1B32]/25 rounded-xl p-4 text-xs space-y-1">
            <div className="font-semibold text-[#9E1B32]">
              Recorded Exit Event ({turnoverEvent.exitType})
            </div>
            <div className="text-[#2A1215]">
              Exit Date: <span className="font-mono">{turnoverEvent.exitDate}</span> · Reason:{' '}
              {turnoverEvent.exitReason}
            </div>
          </div>
        )}
      </section>

      {/* ATTENDANCE TREND */}
      <section className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#2A1215]">12-Month Attendance Trajectory</h3>
          <span className="text-xs font-mono text-[#6E5A58]">{attRows.length} months logged</span>
        </div>
        <MultiLineTrendChart
          labels={attRows.map((r) => r.monthKey.slice(2))}
          series={[
            {
              id: 'att',
              name: 'Attendance %',
              color: PALETTE.burgundy,
              values: attRows.map((r) => r.attendanceRatePct),
            },
          ]}
          height={175}
          ySuffix="%"
          yMinOverride={75}
        />
      </section>

      {/* PERFORMANCE HISTORY TABLE */}
      <section className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[#2A1215]">Quarterly Performance Reviews</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E7DDD1] text-[#6E5A58]">
                <th className="py-2 text-left font-medium">Period</th>
                <th className="py-2 text-right font-medium">Rating</th>
                <th className="py-2 text-right font-medium">KPI %</th>
                <th className="py-2 text-right font-medium">Goals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3ECE2] tabular-nums font-mono">
              {perfRows.map((r) => (
                <tr key={r.reviewId}>
                  <td className="py-2 text-[#2A1215]">{r.reviewPeriod}</td>
                  <td className="py-2 text-right text-[#5C162E] font-medium">{r.ratingScore.toFixed(2)}</td>
                  <td className="py-2 text-right">{r.kpiAchievementPct}%</td>
                  <td className="py-2 text-right">
                    {r.goalsMet}/{r.goalsTotal}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* LEAVE LOGS */}
      <section className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-[#2A1215]">
          Leave History ({leaveRows.reduce((s, l) => s + l.daysTaken, 0)} total days)
        </h3>
        {leaveRows.length === 0 ? (
          <p className="text-xs text-[#6E5A58]">No leave requests recorded in the observation window.</p>
        ) : (
          <div className="space-y-1.5 text-xs">
            {leaveRows.slice(-5).map((l) => (
              <div key={l.leaveId} className="flex justify-between py-1 border-b border-[#F3ECE2] last:border-0">
                <span className="text-[#2A1215]">{l.leaveType}</span>
                <span className="font-mono tabular-nums text-[#6E5A58]">
                  {l.startDate} · {l.daysTaken}d
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CLEARLY SEPARATED PREDICTIVE ML SECTION */}
      {prediction && (
        <section className="bg-[#FFFDF9] border border-[#B76E79]/50 rounded-xl p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-[#75203C]">
                <ShieldCheck className="w-4 h-4" />
                <span>Predictive Model Estimate (Separate from HR Records)</span>
              </div>
              <h3 className="text-sm font-semibold text-[#2A1215] mt-1">
                Logistic Regression Attrition Risk
              </h3>
            </div>
            <div className="text-right">
              <div className="text-xl font-semibold font-mono tabular-nums text-[#5C162E]">
                {Math.round(prediction.predictedRiskProb * 100)}%
              </div>
              <div className="text-[11px] font-medium text-[#6E5A58]">{prediction.riskTier}</div>
            </div>
          </div>

          <p className="text-[11px] text-[#6E5A58] leading-relaxed">
            Computed exclusively from operational & workload signals (overtime, attendance, KPIs, training,
            tenure). Protected attributes are never collected or scored.
          </p>

          <div className="space-y-2 pt-1">
            <div className="text-xs font-medium text-[#2A1215]">Top Explainable Risk Drivers</div>
            {prediction.topDrivers.map((d) => (
              <div key={d.factor} className="flex items-center justify-between text-xs py-1 border-b border-[#F3ECE2] last:border-0">
                <div>
                  <span className="font-medium text-[#2A1215]">{d.factor}</span>
                  <span className="text-[#6E5A58] ml-2 font-mono text-[11px]">{d.detail}</span>
                </div>
                <span
                  className={`font-mono tabular-nums font-medium ${
                    d.impact > 0 ? 'text-[#9E1B32]' : 'text-[#2D6A4F]'
                  }`}
                >
                  {d.impact > 0 ? `+${d.impact}` : d.impact} log-odds
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
};

const DepartmentDrillContent: React.FC<{
  rollup: DepartmentRollup;
  onSelectEmployee: (emp: Employee) => void;
}> = ({ rollup, onSelectEmployee }) => {
  const { dataset } = useHrData();
  const deptEmployees = dataset.employees
    .filter((e) => e.departmentId === rollup.departmentId && e.status === 'Active')
    .slice(0, 14);

  const deptExits = dataset.turnoverEvents
    .filter((t) => t.departmentId === rollup.departmentId)
    .slice(-6);

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-4">
          <div className="text-xs text-[#6E5A58]">Active / Target Headcount</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-[#2A1215] mt-1">
            {rollup.activeCount} / {rollup.targetHeadcount}
          </div>
          <div className="text-xs text-[#6E5A58] mt-1">
            Variance: {rollup.headcountVariance >= 0 ? `+${rollup.headcountVariance}` : rollup.headcountVariance}
          </div>
        </div>
        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-4">
          <div className="text-xs text-[#6E5A58]">Turnover / Retention</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-[#5C162E] mt-1">
            {rollup.turnoverRatePct}% / {rollup.retentionRatePct}%
          </div>
          <div className="text-xs text-[#6E5A58] mt-1">
            Avg tenure: {rollup.avgTenureMonths} months
          </div>
        </div>
        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-4">
          <div className="text-xs text-[#6E5A58]">Avg Attendance Rate</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-[#2A1215] mt-1">
            {rollup.avgAttendancePct}%
          </div>
          <div className="text-xs text-[#6E5A58] mt-1">Late rate: {rollup.lateArrivalRatePct}%</div>
        </div>
        <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-4">
          <div className="text-xs text-[#6E5A58]">Performance / KPI</div>
          <div className="text-2xl font-semibold font-mono tabular-nums text-[#2A1215] mt-1">
            {rollup.avgPerformanceScore} / 5.0
          </div>
          <div className="text-xs text-[#6E5A58] mt-1">KPI Attainment: {rollup.avgKpiPct}%</div>
        </div>
      </div>

      <section className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[#2A1215]">Active Roster Sample (Click to Inspect)</h3>
        <div className="divide-y divide-[#F3ECE2]">
          {deptEmployees.map((emp) => (
            <button
              key={emp.employeeId}
              type="button"
              onClick={() => onSelectEmployee(emp)}
              className="w-full py-2.5 flex items-center justify-between text-left hover:bg-[#FAF7F2] px-2 rounded transition-colors cursor-pointer"
            >
              <div>
                <div className="text-xs font-medium text-[#2A1215]">{emp.fullName}</div>
                <div className="text-[11px] text-[#6E5A58]">
                  {emp.roleTitle} · {emp.workMode}
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-[#5C162E]">
                <span>{emp.tenureMonths}m</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-[#2A1215]">Recent Turnover Events ({deptExits.length})</h3>
        {deptExits.length === 0 ? (
          <p className="text-xs text-[#6E5A58]">No exits recorded in this department.</p>
        ) : (
          <div className="space-y-1.5 text-xs">
            {deptExits.map((ex) => (
              <div key={ex.turnoverId} className="flex justify-between py-1 border-b border-[#F3ECE2] last:border-0">
                <span className="text-[#2A1215]">
                  {ex.exitReason} ({ex.exitType})
                </span>
                <span className="font-mono text-[#6E5A58]">{ex.exitDate}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
};
