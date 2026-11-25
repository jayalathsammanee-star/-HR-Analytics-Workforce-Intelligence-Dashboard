import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Download,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  UserPlus,
} from 'lucide-react';
import { useHrData } from '../../context/HrDataContext';
import { DEPARTMENTS, toCsvString, triggerCsvDownload } from '../../data/syntheticHrData';
import { Employee, WorkMode } from '../../types/hr';

type TableKey =
  | 'employees'
  | 'departments'
  | 'attendance'
  | 'performance'
  | 'leaves'
  | 'turnover'
  | 'dates';

interface SampleDataViewProps {
  onSelectEmployee: (emp: Employee) => void;
}

const SAMPLE_ROLES = [
  'Senior Data Analyst',
  'Enterprise Account Executive',
  'Staff Backend Engineer',
  'Customer Success Manager',
  'Product Operations Lead',
  'Financial Planning Analyst',
];

const SAMPLE_NAMES = [
  'Elena Rostova',
  'Marcus Vance',
  'Ananya Nair',
  'Julian Brooks',
  'Sora Takahashi',
  'Camille Laurent',
];

export const SampleDataView: React.FC<SampleDataViewProps> = ({ onSelectEmployee }) => {
  const { dataset, addedRecordsCount, addSampleBatch, addCustomSampleEmployee, resetDataset } =
    useHrData();

  const [activeTable, setActiveTable] = useState<TableKey>('employees');
  const [tableSearch, setTableSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 12;

  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('Elena Rostova');
  const [departmentId, setDepartmentId] = useState(DEPARTMENTS[0].departmentId);
  const [roleTitle, setRoleTitle] = useState('Senior Data Analyst');
  const [workMode, setWorkMode] = useState<WorkMode>('Hybrid');
  const [overtimeHoursAvg, setOvertimeHoursAvg] = useState(14);
  const [attendanceTargetPct, setAttendanceTargetPct] = useState(94);
  const [ratingScore, setRatingScore] = useState(4.1);
  const [kpiAchievementPct, setKpiAchievementPct] = useState(95);
  const [trainingHoursYtd, setTrainingHoursYtd] = useState(28);
  const [promotionLast2Yr, setPromotionLast2Yr] = useState(true);
  const [status, setStatus] = useState<'Active' | 'Exited'>('Active');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const notify = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleFillRandom = () => {
    const dept = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
    const modes: WorkMode[] = ['Hybrid', 'Remote', 'On-Site'];
    setFullName(SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)]);
    setDepartmentId(dept.departmentId);
    setRoleTitle(SAMPLE_ROLES[Math.floor(Math.random() * SAMPLE_ROLES.length)]);
    setWorkMode(modes[Math.floor(Math.random() * modes.length)]);
    setOvertimeHoursAvg(Math.round(4 + Math.random() * 24));
    setAttendanceTargetPct(Math.round(85 + Math.random() * 13));
    setRatingScore(Math.round((2.6 + Math.random() * 2.2) * 10) / 10);
    setKpiAchievementPct(Math.round(72 + Math.random() * 35));
    setTrainingHoursYtd(Math.round(8 + Math.random() * 36));
    setPromotionLast2Yr(Math.random() > 0.55);
    setStatus(Math.random() > 0.8 ? 'Exited' : 'Active');
  };

  const handleSubmitCustom = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomSampleEmployee({
      fullName,
      departmentId,
      roleTitle,
      workMode,
      overtimeHoursAvg,
      attendanceTargetPct,
      ratingScore,
      kpiAchievementPct,
      trainingHoursYtd,
      promotionLast2Yr,
      status,
    });
    setActiveTable('employees');
    setPage(0);
    notify(`Added sample employee "${fullName}" with 12 months of attendance & 4 quarterly reviews.`);
  };

  const tableTabs: Array<{ key: TableKey; label: string; count: number }> = [
    { key: 'employees', label: 'dim_employees', count: dataset.employees.length },
    { key: 'departments', label: 'dim_departments', count: dataset.departments.length },
    { key: 'attendance', label: 'fact_attendance', count: dataset.attendanceMonthly.length },
    { key: 'performance', label: 'fact_performance', count: dataset.performanceReviews.length },
    { key: 'leaves', label: 'fact_leave_records', count: dataset.leaveRecords.length },
    { key: 'turnover', label: 'fact_employee_turnover', count: dataset.turnoverEvents.length },
    { key: 'dates', label: 'dim_date', count: dataset.dateDimension.length },
  ];

  const activeRows = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    const match = (obj: object) =>
      !q || Object.values(obj).some((v) => String(v ?? '').toLowerCase().includes(q));

    switch (activeTable) {
      case 'employees':
        return dataset.employees.filter(match);
      case 'departments':
        return dataset.departments.filter(match);
      case 'attendance':
        return dataset.attendanceMonthly.filter(match);
      case 'performance':
        return dataset.performanceReviews.filter(match);
      case 'leaves':
        return dataset.leaveRecords.filter(match);
      case 'turnover':
        return dataset.turnoverEvents.filter(match);
      case 'dates':
        return dataset.dateDimension.filter(match);
    }
  }, [activeTable, dataset, tableSearch]);

  const totalPages = Math.max(1, Math.ceil(activeRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pagedRows = activeRows.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const handleExportTable = () => {
    triggerCsvDownload(`${activeTable}_sample_data.csv`, toCsvString(activeRows as object[]));
  };

  return (
    <div className="space-y-6">
      {/* Sample Data Generation Controls */}
      <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#2A1215]">
              Sample Data Generator & Warehouse Explorer
            </h2>
            <p className="text-xs text-[#6E5A58] mt-1">
              Inspect raw relational records across all 7 tables or append new sample employees to watch KPIs,
              heatmaps, and ML attrition models recompute live.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                addSampleBatch(10, 'balanced');
                setPage(0);
                notify('Appended 10 balanced sample employees with correlated attendance, KPI, and leave records.');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#5C162E] text-xs font-medium text-[#FAF7F2] hover:bg-[#75203C] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add 10 Balanced Sample Staff</span>
            </button>

            <button
              type="button"
              onClick={() => {
                addSampleBatch(10, 'high-strain');
                setPage(0);
                notify('Appended 10 high-overtime sample records — Logistic Regression & Turnover KPIs updated.');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#B76E79] bg-[#FFFDF9] text-xs font-medium text-[#5C162E] hover:bg-[#F7EAE7] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Add 10 High-Strain Attrition Samples</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E7DDD1] bg-[#FAF7F2] text-xs font-medium text-[#2A1215] hover:border-[#B76E79] transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Close Custom Form' : 'Add Custom Employee'}</span>
            </button>

            {addedRecordsCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  resetDataset();
                  setPage(0);
                  notify('Restored default 342-employee synthetic dataset.');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#6E5A58] hover:text-[#2A1215] hover:bg-[#F3ECE2] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ({addedRecordsCount} added)</span>
              </button>
            )}
          </div>
        </div>

        {feedbackMsg && (
          <div className="px-4 py-2.5 rounded-lg bg-[#2D6A4F]/10 border border-[#2D6A4F]/25 text-xs font-medium text-[#2D6A4F]">
            {feedbackMsg}
          </div>
        )}

        {/* Custom Sample Employee Form */}
        {showAddForm && (
          <form
            onSubmit={handleSubmitCustom}
            className="pt-4 border-t border-[#E7DDD1] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs"
          >
            <label className="space-y-1">
              <span className="text-[#6E5A58] font-medium">Full Name</span>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E7DDD1] bg-[#FAF7F2] text-[#2A1215]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[#6E5A58] font-medium">Department</span>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E7DDD1] bg-[#FAF7F2] text-[#2A1215]"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>
                    {d.departmentName}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[#6E5A58] font-medium">Role Title</span>
              <input
                type="text"
                required
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#E7DDD1] bg-[#FAF7F2] text-[#2A1215]"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[#6E5A58] font-medium">Work Mode & Status</span>
              <div className="flex gap-2">
                <select
                  value={workMode}
                  onChange={(e) => setWorkMode(e.target.value as WorkMode)}
                  className="flex-1 px-2 py-2 rounded-lg border border-[#E7DDD1] bg-[#FAF7F2] text-[#2A1215]"
                >
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                  <option value="On-Site">On-Site</option>
                </select>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Active' | 'Exited')}
                  className="flex-1 px-2 py-2 rounded-lg border border-[#E7DDD1] bg-[#FAF7F2] text-[#2A1215]"
                >
                  <option value="Active">Active</option>
                  <option value="Exited">Exited</option>
                </select>
              </div>
            </label>

            <label className="space-y-1">
              <span className="text-[#6E5A58] font-medium">Monthly Overtime (hrs)</span>
              <input
                type="number"
                min={0}
                max={40}
                value={overtimeHoursAvg}
                onChange={(e) => setOvertimeHoursAvg(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-[#E7DDD1] bg-[#FAF7F2] font-mono"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[#6E5A58] font-medium">Target Attendance (%)</span>
              <input
                type="number"
                min={70}
                max={100}
                value={attendanceTargetPct}
                onChange={(e) => setAttendanceTargetPct(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-[#E7DDD1] bg-[#FAF7F2] font-mono"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[#6E5A58] font-medium">Rating (1-5) & KPI %</span>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={0.1}
                  value={ratingScore}
                  onChange={(e) => setRatingScore(Number(e.target.value))}
                  className="w-1/2 px-2 py-2 rounded-lg border border-[#E7DDD1] bg-[#FAF7F2] font-mono"
                />
                <input
                  type="number"
                  min={45}
                  max={120}
                  value={kpiAchievementPct}
                  onChange={(e) => setKpiAchievementPct(Number(e.target.value))}
                  className="w-1/2 px-2 py-2 rounded-lg border border-[#E7DDD1] bg-[#FAF7F2] font-mono"
                />
              </div>
            </label>

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={handleFillRandom}
                className="px-3 py-2 rounded-lg border border-[#E7DDD1] bg-[#FAF7F2] text-xs font-medium text-[#2A1215] hover:border-[#B76E79] cursor-pointer"
              >
                Randomize
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 rounded-lg bg-[#5C162E] text-xs font-medium text-[#FAF7F2] hover:bg-[#75203C] cursor-pointer"
              >
                Insert Record
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Interactive Table Browser */}
      <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E7DDD1] bg-[#FAF7F2] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EAE0D5] rounded-lg">
            {tableTabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTable(t.key);
                  setPage(0);
                }}
                className={`px-2.5 py-1.5 text-xs font-mono rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeTable === t.key
                    ? 'bg-[#FFFDF9] text-[#5C162E] font-medium'
                    : 'text-[#4E3837] hover:text-[#2A1215]'
                }`}
              >
                {t.label} ({t.count.toLocaleString()})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6E5A58] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Filter rows..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E7DDD1] bg-[#FFFDF9] text-[#2A1215] w-44 focus:outline-none focus:border-[#5C162E]"
              />
            </div>

            <button
              type="button"
              onClick={handleExportTable}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7DDD1] bg-[#FFFDF9] text-xs font-medium text-[#5C162E] hover:border-[#B76E79] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {pagedRows.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6E5A58]">
              No sample rows match your filter query.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E7DDD1] text-[#6E5A58] bg-[#FAF7F2]/60">
                  {Object.keys(pagedRows[0]).map((col) => (
                    <th key={col} className="px-4 py-2.5 text-left font-mono font-medium whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                  {activeTable === 'employees' && <th className="px-4 py-2.5 text-right font-medium">Inspect</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3ECE2] tabular-nums">
                {pagedRows.map((row, idx) => {
                  const empRow = activeTable === 'employees' ? (row as Employee) : null;
                  return (
                    <tr
                      key={idx}
                      onClick={() => empRow && onSelectEmployee(empRow)}
                      className={
                        empRow
                          ? 'hover:bg-[#FAF7F2] cursor-pointer transition-colors'
                          : 'hover:bg-[#FAF7F2]/60'
                      }
                    >
                      {Object.entries(row).map(([k, val]) => (
                        <td
                          key={k}
                          className="px-4 py-2.5 whitespace-nowrap font-mono text-[11.5px] text-[#2A1215]"
                        >
                          {val === null ? 'NULL' : String(val)}
                        </td>
                      ))}
                      {empRow && (
                        <td className="px-4 py-2.5 text-right text-[#5C162E]">
                          <ArrowUpRight className="w-3.5 h-3.5 inline" />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-[#E7DDD1] bg-[#FAF7F2] flex items-center justify-between text-xs text-[#6E5A58]">
          <span className="font-mono tabular-nums">
            Showing {activeRows.length === 0 ? 0 : safePage * pageSize + 1}–
            {Math.min(activeRows.length, (safePage + 1) * pageSize)} of{' '}
            {activeRows.length.toLocaleString()} rows
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1 rounded border border-[#E7DDD1] bg-[#FFFDF9] disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="font-mono tabular-nums">
              {safePage + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="px-3 py-1 rounded border border-[#E7DDD1] bg-[#FFFDF9] disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
