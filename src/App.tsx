import React, { useState } from 'react';
import {
  ArrowRight,
  Download,
  Menu,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { HrDataProvider, useHrData } from './context/HrDataContext';
import { DEPARTMENTS, toCsvString, triggerCsvDownload } from './data/syntheticHrData';
import { DepartmentRollup, Employee, GlobalFilters, WorkMode } from './types/hr';
import { ExecutiveOverview } from './components/views/ExecutiveOverview';
import { PerformanceAnalytics } from './components/views/PerformanceAnalytics';
import { AttendanceAnalytics } from './components/views/AttendanceAnalytics';
import { TurnoverAnalytics } from './components/views/TurnoverAnalytics';
import { DepartmentAnalytics } from './components/views/DepartmentAnalytics';
import { MlForecastingLab } from './components/views/MlForecastingLab';
import { DataModelSqlView } from './components/views/DataModelSqlView';
import { DeliverablesHubView } from './components/views/DeliverablesHubView';
import { SampleDataView } from './components/views/SampleDataView';
import { DrillTarget, DrillThroughDrawer } from './components/DrillThroughDrawer';

type PrimarySection = 'overview' | 'workforce' | 'attrition' | 'sample-data' | 'architecture';

type SubModuleId =
  | 'overview'
  | 'performance'
  | 'attendance'
  | 'departments'
  | 'turnover'
  | 'ml-lab'
  | 'sample-data'
  | 'data-sql'
  | 'deliverables';

const TOP_NAV_ITEMS: Array<{ id: PrimarySection; label: string; defaultModule: SubModuleId }> = [
  { id: 'overview', label: 'Overview', defaultModule: 'overview' },
  { id: 'workforce', label: 'Workforce', defaultModule: 'performance' },
  { id: 'attrition', label: 'Attrition & ML', defaultModule: 'turnover' },
  { id: 'sample-data', label: 'Sample Data', defaultModule: 'sample-data' },
  { id: 'architecture', label: 'SQL & Python', defaultModule: 'data-sql' },
];

const SUB_TABS_BY_SECTION: Partial<
  Record<PrimarySection, Array<{ id: SubModuleId; label: string }>>
> = {
  workforce: [
    { id: 'performance', label: 'Performance Analytics' },
    { id: 'attendance', label: 'Attendance & Leave' },
    { id: 'departments', label: 'Department Scorecards' },
  ],
  attrition: [
    { id: 'turnover', label: 'Turnover & Retention' },
    { id: 'ml-lab', label: 'ML & Forecasting Lab' },
  ],
  architecture: [
    { id: 'data-sql', label: 'Data Model & MySQL' },
    { id: 'deliverables', label: 'Python, DAX & Power BI' },
  ],
};

const MODULE_META: Record<SubModuleId, { section: PrimarySection; title: string; subtitle: string }> = {
  overview: {
    section: 'overview',
    title: 'Executive HR Overview',
    subtitle: 'Workforce headcount, hiring velocity, attendance reliability, and departmental distribution.',
  },
  performance: {
    section: 'workforce',
    title: 'Employee Performance Analytics',
    subtitle: 'Quarterly appraisal distribution, KPI attainment, and individual progression metrics.',
  },
  attendance: {
    section: 'workforce',
    title: 'Attendance & Leave Analytics',
    subtitle: 'Daily presence heatmaps, late arrival variance, and leave utilization trends.',
  },
  departments: {
    section: 'workforce',
    title: 'Department Intelligence',
    subtitle: 'Cross-functional headcount plans, KPI execution, and departmental scorecards.',
  },
  turnover: {
    section: 'attrition',
    title: 'Employee Turnover & Attrition',
    subtitle: 'Historical separation cohorts, exit drivers, and explainable retention risk watchlists.',
  },
  'ml-lab': {
    section: 'attrition',
    title: 'Predictive Analytics & ML Lab',
    subtitle: 'L2 Logistic Regression attrition scoring, OLS forecasting, and K-Means clustering.',
  },
  'sample-data': {
    section: 'sample-data',
    title: 'Sample Data Explorer & Generator',
    subtitle: 'Browse normalized table rows, add sample employee batches, or insert custom HR records.',
  },
  'data-sql': {
    section: 'architecture',
    title: 'Relational Data Model & MySQL',
    subtitle: 'Normalized 7-table star schema, PK/FK constraints, and analytical SQL views.',
  },
  deliverables: {
    section: 'architecture',
    title: 'Python, DAX & Power BI Deliverables',
    subtitle: 'Downloadable synthetic CSVs, Pandas/Scikit-learn pipelines, DAX measures, and README.',
  },
};

const DEFAULT_FILTERS: GlobalFilters = {
  departmentId: 'ALL',
  horizonMonths: 12,
  workMode: 'ALL',
  searchQuery: '',
};

function AppWorkspace() {
  const { dataset } = useHrData();
  const [activeModule, setActiveModule] = useState<SubModuleId>('overview');
  const [filters, setFilters] = useState<GlobalFilters>(DEFAULT_FILTERS);
  const [drillTarget, setDrillTarget] = useState<DrillTarget>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const activeSection = MODULE_META[activeModule].section;
  const activeMeta = MODULE_META[activeModule];
  const subTabs = SUB_TABS_BY_SECTION[activeSection];

  const handleSelectEmployee = (employee: Employee) => {
    setDrillTarget({ type: 'employee', employee });
  };

  const handleSelectDepartment = (rollup: DepartmentRollup) => {
    setDrillTarget({ type: 'department', rollup });
  };

  const handleExportCurrentCsv = () => {
    const rows = dataset.employees.filter(
      (e) =>
        (filters.departmentId === 'ALL' || e.departmentId === filters.departmentId) &&
        (filters.workMode === 'ALL' || e.workMode === filters.workMode)
    );
    triggerCsvDownload('hr_workforce_filtered.csv', toCsvString(rows));
  };

  const navigateLegacyTab = (tab: string) => {
    if (tab in MODULE_META) {
      setActiveModule(tab as SubModuleId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const hasCustomFilters =
    filters.departmentId !== 'ALL' ||
    filters.horizonMonths !== 12 ||
    filters.workMode !== 'ALL' ||
    filters.searchQuery.trim() !== '';

  const showSlicerBar =
    activeModule !== 'data-sql' &&
    activeModule !== 'deliverables' &&
    activeModule !== 'sample-data';

  const activeEmployeesCount = dataset.employees.filter((e) => e.status === 'Active').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#2A1215]">
      {/* Website Top Navigation Bar (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-30 bg-[#FFFDF9]/95 backdrop-blur-xs border-b border-[#E7DDD1]">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Wordmark (single line) */}
          <button
            type="button"
            onClick={() => setActiveModule('overview')}
            className="font-display text-lg font-bold tracking-tight text-[#5C162E] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Workforce Intelligence
          </button>

          {/* Zone 2: Horizontal Website Navigation Links */}
          <nav className="hidden md:flex items-center gap-7" aria-label="Website navigation">
            {TOP_NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.defaultModule)}
                  className={`relative py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'text-[#5C162E]'
                      : 'text-[#6E5A58] hover:text-[#2A1215]'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-[#5C162E]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary Action + Mobile Menu Trigger */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleExportCurrentCsv}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#5C162E] text-xs font-medium text-[#FAF7F2] hover:bg-[#75203C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="md:hidden p-2 rounded-lg text-[#5C162E] hover:bg-[#F3ECE2]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E7DDD1] bg-[#FFFDF9] px-4 py-3 space-y-1">
            {TOP_NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveModule(item.defaultModule);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive ? 'bg-[#5C162E] text-[#FAF7F2]' : 'text-[#2A1215] hover:bg-[#F3ECE2]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Website Hero Section (Shown on Overview Landing Page) */}
      {activeModule === 'overview' && (
        <section className="bg-gradient-to-b from-[#360C1B] to-[#5C162E] text-[#FAF7F2] border-b border-[#4A1226]">
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-10 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="text-xs font-medium text-[#DAB0AE] tracking-wide">
                  HR Analytics & Workforce Intelligence System · MySQL · Python · Power BI
                </div>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#FFFDF9] max-w-2xl leading-[1.15]">
                  Enterprise People Analytics, Attendance & Predictive Retention
                </h1>
                <p className="text-sm sm:text-base text-[#ECD4D0] max-w-2xl leading-relaxed">
                  Explore live workforce metrics computed directly from a normalized 7-table synthetic HR
                  warehouse ({dataset.employees.length} historical & active staff across 6 departments over
                  24 months), backed by explainable attrition modeling and downloadable SQL, Python, and DAX
                  artifacts.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setActiveModule('ml-lab')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#B76E79] text-xs font-semibold text-[#FFFDF9] hover:bg-[#C88A90] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Open ML & Forecasting Lab</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('sample-data')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#B76E79]/60 bg-[#360C1B]/60 text-xs font-medium text-[#FAF7F2] hover:bg-[#4A1226] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <span>Browse & Add Sample Data</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModule('data-sql')}
                  className="px-3 py-2.5 text-xs font-medium text-[#DAB0AE] hover:text-[#FFFDF9] underline-offset-4 hover:underline whitespace-nowrap cursor-pointer"
                >
                  Inspect SQL Schema & DAX
                </button>
              </div>
            </div>

            {/* Right Column: Executive Brief Card */}
            <div className="lg:col-span-4 bg-[#2A0A14]/70 border border-[#B76E79]/35 rounded-xl p-5 flex flex-col justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {!avatarError ? (
                  <img
                    src="/src/assets/images/avatar_hr_director_1795375206147.jpg"
                    alt="People Analytics Director"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarError(true)}
                    className="w-12 h-12 rounded-full object-cover border border-[#B76E79] shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[#5C162E] text-[#FAF7F2] text-sm font-semibold flex items-center justify-center shrink-0">
                    HR
                  </div>
                )}
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#FFFDF9] truncate">
                    People Analytics Brief
                  </div>
                  <div className="text-xs text-[#DAB0AE] truncate">
                    Live Warehouse · {activeEmployeesCount} Active Staff
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#5C162E] text-xs">
                <div>
                  <div className="text-[#DAB0AE]">Observation Window</div>
                  <div className="font-mono text-sm font-semibold text-[#FFFDF9] mt-0.5 tabular-nums">
                    Dec 24 – Nov 26
                  </div>
                </div>
                <div>
                  <div className="text-[#DAB0AE]">ML Governance</div>
                  <div className="font-mono text-sm font-semibold text-[#FFFDF9] mt-0.5">
                    Non-Demographic
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Website Content Container */}
      <main className="flex-1 w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-6">
        {/* Sub-Navigation Tabs + Page Title + Dynamic Slicer Toolbar */}
        <div className="space-y-4 pb-5 border-b border-[#E7DDD1]">
          {subTabs && (
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#EFE6DA] rounded-lg w-fit">
              {subTabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveModule(t.id)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    activeModule === t.id
                      ? 'bg-[#5C162E] text-[#FAF7F2]'
                      : 'text-[#4E3837] hover:text-[#2A1215]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-[#2A1215] font-display">
                {activeMeta.title}
              </h2>
              <p className="text-sm text-[#6E5A58] mt-1">{activeMeta.subtitle}</p>
            </div>

            {showSlicerBar && (
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#6E5A58] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={filters.searchQuery}
                    onChange={(e) =>
                      setFilters((f) => ({ ...f, searchQuery: e.target.value }))
                    }
                    placeholder="Search employee or role..."
                    aria-label="Search employee or role"
                    className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#E7DDD1] bg-[#FFFDF9] text-[#2A1215] placeholder:text-[#9A8784] focus:outline-none focus:border-[#5C162E] w-48"
                  />
                </div>

                <select
                  value={filters.departmentId}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, departmentId: e.target.value }))
                  }
                  aria-label="Filter by department"
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E7DDD1] bg-[#FFFDF9] text-[#2A1215] focus:outline-none focus:border-[#5C162E] cursor-pointer"
                >
                  <option value="ALL">All Departments</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.departmentId} value={d.departmentId}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.workMode}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      workMode: e.target.value as 'ALL' | WorkMode,
                    }))
                  }
                  aria-label="Filter by work mode"
                  className="px-3 py-1.5 text-xs rounded-lg border border-[#E7DDD1] bg-[#FFFDF9] text-[#2A1215] focus:outline-none focus:border-[#5C162E] cursor-pointer"
                >
                  <option value="ALL">All Work Modes</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                  <option value="On-Site">On-Site</option>
                </select>

                <div className="flex items-center gap-0.5 p-0.5 bg-[#EFE6DA] rounded-lg">
                  {([6, 12, 24] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, horizonMonths: m }))}
                      className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer ${
                        filters.horizonMonths === m
                          ? 'bg-[#5C162E] text-[#FAF7F2]'
                          : 'text-[#4E3837] hover:text-[#2A1215]'
                      }`}
                    >
                      {m}M
                    </button>
                  ))}
                </div>

                {hasCustomFilters && (
                  <button
                    type="button"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#5C162E] hover:bg-[#F3ECE2] rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active Page Module */}
        {activeModule === 'overview' && (
          <ExecutiveOverview
            filters={filters}
            onSelectEmployee={handleSelectEmployee}
            onSelectDepartment={handleSelectDepartment}
            onNavigateTab={navigateLegacyTab}
          />
        )}
        {activeModule === 'performance' && (
          <PerformanceAnalytics
            filters={filters}
            onSelectEmployee={handleSelectEmployee}
          />
        )}
        {activeModule === 'attendance' && <AttendanceAnalytics filters={filters} />}
        {activeModule === 'departments' && (
          <DepartmentAnalytics
            filters={filters}
            onSelectDepartment={handleSelectDepartment}
          />
        )}
        {activeModule === 'turnover' && (
          <TurnoverAnalytics
            filters={filters}
            onSelectEmployee={handleSelectEmployee}
          />
        )}
        {activeModule === 'ml-lab' && (
          <MlForecastingLab
            filters={filters}
            onSelectEmployee={handleSelectEmployee}
          />
        )}
        {activeModule === 'sample-data' && (
          <SampleDataView onSelectEmployee={handleSelectEmployee} />
        )}
        {activeModule === 'data-sql' && <DataModelSqlView />}
        {activeModule === 'deliverables' && <DeliverablesHubView />}
      </main>

      {/* Clean Website Footer */}
      <footer className="bg-[#FFFDF9] border-t border-[#E7DDD1] mt-12">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs text-[#6E5A58]">
          <div className="space-y-1">
            <div className="font-display text-sm font-semibold text-[#5C162E]">
              HR Analytics & Workforce Intelligence System
            </div>
            <div>
              Synthetic Relational Cohort ({dataset.employees.length} records) · Zero real PII ·
              Explainable ML & Power BI Architecture
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 font-medium">
            <button
              type="button"
              onClick={() => navigateLegacyTab('overview')}
              className="hover:text-[#5C162E] cursor-pointer"
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => navigateLegacyTab('performance')}
              className="hover:text-[#5C162E] cursor-pointer"
            >
              Performance
            </button>
            <button
              type="button"
              onClick={() => navigateLegacyTab('attendance')}
              className="hover:text-[#5C162E] cursor-pointer"
            >
              Attendance
            </button>
            <button
              type="button"
              onClick={() => navigateLegacyTab('ml-lab')}
              className="hover:text-[#5C162E] cursor-pointer"
            >
              ML Lab
            </button>
            <button
              type="button"
              onClick={() => navigateLegacyTab('sample-data')}
              className="hover:text-[#5C162E] cursor-pointer"
            >
              Sample Data
            </button>
            <button
              type="button"
              onClick={() => navigateLegacyTab('deliverables')}
              className="hover:text-[#5C162E] cursor-pointer"
            >
              Python & DAX
            </button>
          </div>
        </div>
      </footer>

      {/* Slide-Over Drill-Through Inspector */}
      <DrillThroughDrawer
        target={drillTarget}
        onClose={() => setDrillTarget(null)}
        onSelectEmployee={handleSelectEmployee}
      />
    </div>
  );
}

export function App() {
  return (
    <HrDataProvider>
      <AppWorkspace />
    </HrDataProvider>
  );
}

export default App;
