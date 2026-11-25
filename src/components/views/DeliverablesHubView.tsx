import React, { useState } from 'react';
import { Check, Copy, Download, FileSpreadsheet } from 'lucide-react';
import {
  DAX_MEASURES_SCRIPT,
  PYTHON_CLEANING_SCRIPT,
  PYTHON_ML_SCRIPT,
  README_MARKDOWN,
} from '../../data/deliverablesContent';
import { toCsvString, triggerCsvDownload } from '../../data/syntheticHrData';
import { useHrData } from '../../context/HrDataContext';

type DeliverableTab = 'python-clean' | 'python-ml' | 'dax' | 'powerbi' | 'readme';

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const DeliverablesHubView: React.FC = () => {
  const { dataset } = useHrData();
  const [activeTab, setActiveTab] = useState<DeliverableTab>('python-clean');
  const [copied, setCopied] = useState(false);

  const codeMap: Record<Exclude<DeliverableTab, 'powerbi'>, { filename: string; content: string }> = {
    'python-clean': { filename: 'data_cleaning.py', content: PYTHON_CLEANING_SCRIPT },
    'python-ml': { filename: 'ml_pipeline.py', content: PYTHON_ML_SCRIPT },
    dax: { filename: 'hr_measures.dax', content: DAX_MEASURES_SCRIPT },
    readme: { filename: 'README.md', content: README_MARKDOWN },
  };

  const handleCopy = async () => {
    if (activeTab === 'powerbi') return;
    await navigator.clipboard.writeText(codeMap[activeTab].content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const datasetExports = [
    {
      label: 'Employees Master',
      file: 'employees.csv',
      rows: dataset.employees.length,
      onExport: () => triggerCsvDownload('employees.csv', toCsvString(dataset.employees)),
    },
    {
      label: 'Departments',
      file: 'departments.csv',
      rows: dataset.departments.length,
      onExport: () => triggerCsvDownload('departments.csv', toCsvString(dataset.departments)),
    },
    {
      label: 'Monthly Attendance',
      file: 'attendance_monthly.csv',
      rows: dataset.attendanceMonthly.length,
      onExport: () =>
        triggerCsvDownload('attendance_monthly.csv', toCsvString(dataset.attendanceMonthly)),
    },
    {
      label: 'Performance Reviews',
      file: 'performance_reviews.csv',
      rows: dataset.performanceReviews.length,
      onExport: () =>
        triggerCsvDownload('performance_reviews.csv', toCsvString(dataset.performanceReviews)),
    },
    {
      label: 'Leave Records',
      file: 'leave_records.csv',
      rows: dataset.leaveRecords.length,
      onExport: () => triggerCsvDownload('leave_records.csv', toCsvString(dataset.leaveRecords)),
    },
    {
      label: 'Turnover Events',
      file: 'turnover_events.csv',
      rows: dataset.turnoverEvents.length,
      onExport: () =>
        triggerCsvDownload('turnover_events.csv', toCsvString(dataset.turnoverEvents)),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Synthetic CSV Dataset Exporter */}
      <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Synthetic HR Dataset Exports (CSV / Excel Ready)
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              Download the exact relational tables powering this dashboard for Power BI Desktop or Python execution
            </p>
          </div>
          <span className="text-xs font-mono text-[#5C162E]">Zero Real PII · Deterministic Seed</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {datasetExports.map((ds) => (
            <button
              key={ds.file}
              type="button"
              onClick={ds.onExport}
              className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-[#E7DDD1] bg-[#FAF7F2] hover:border-[#B76E79] hover:bg-[#FFFDF9] transition-colors text-left cursor-pointer"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#2A1215] flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#5C162E]" />
                  <span>{ds.label}</span>
                </div>
                <div className="text-[11px] font-mono text-[#6E5A58] mt-0.5">
                  {ds.file} · {ds.rows.toLocaleString()} rows
                </div>
              </div>
              <Download className="w-4 h-4 text-[#5C162E] shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Code & Architecture Deliverables Tabs */}
      <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E7DDD1] flex flex-wrap items-center justify-between gap-3 bg-[#FAF7F2]">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EAE0D5] rounded-lg">
            {[
              { id: 'python-clean', label: 'Python ETL (data_cleaning.py)' },
              { id: 'python-ml', label: 'Python ML (ml_pipeline.py)' },
              { id: 'dax', label: 'Power BI DAX (hr_measures.dax)' },
              { id: 'powerbi', label: 'Power BI & Project Guide' },
              { id: 'readme', label: 'GitHub README.md' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as DeliverableTab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === t.id
                    ? 'bg-[#FFFDF9] text-[#5C162E]'
                    : 'text-[#4E3837] hover:text-[#2A1215]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab !== 'powerbi' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7DDD1] bg-[#FFFDF9] text-xs font-medium text-[#2A1215] hover:border-[#B76E79] transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#2D6A4F]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadTextFile(codeMap[activeTab].filename, codeMap[activeTab].content)
                }
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5C162E] text-xs font-medium text-[#FAF7F2] hover:bg-[#75203C] transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download {codeMap[activeTab].filename}</span>
              </button>
            </div>
          )}
        </div>

        {activeTab === 'powerbi' ? (
          <div className="p-6 space-y-6 text-xs text-[#2A1215] leading-relaxed">
            <div>
              <h4 className="text-sm font-semibold text-[#5C162E]">
                Power BI Desktop Implementation & Step-by-Step Architecture
              </h4>
              <p className="text-[#6E5A58] mt-1">
                Follow these 5 stages to reproduce the exact enterprise BI workflow in Microsoft Power BI Desktop, MySQL, and Python.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  step: '01. Relational Database & Dataset Preparation',
                  body: 'Execute schema.sql in MySQL 8.0 to provision the 7 star-schema tables (dim_departments, dim_employees, dim_date, fact_attendance, fact_performance, fact_leave_records, fact_employee_turnover). Load the exported CSVs via MySQL Workbench or LOAD DATA INFILE.',
                },
                {
                  step: '02. Python Data Cleaning & Feature Mart',
                  body: 'Run data_cleaning.py using Pandas & NumPy to enforce date integrity (exit_date >= hire_date), cap extreme overtime outliers, impute new-hire cold starts using department medians, and output hr_feature_mart_clean.csv.',
                },
                {
                  step: '03. Scikit-learn Predictive & Clustering Models',
                  body: 'Run ml_pipeline.py to train the L2-regularized Logistic Regression attrition classifier (with StandardScaler & 80/20 stratified holdout), fit OLS workforce forecasts, and execute K-Means (k=3) behavioral clustering.',
                },
                {
                  step: '04. Power BI Data Model & DAX Measures',
                  body: 'Connect Power BI Desktop to MySQL or the CSV exports. Verify 1:* single-direction relationships from dim_date, dim_departments, and dim_employees to the 4 fact tables, then create a dedicated _Measures table using hr_measures.dax.',
                },
              ].map((card) => (
                <div
                  key={card.step}
                  className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E7DDD1] space-y-1.5"
                >
                  <div className="font-semibold text-[#5C162E]">{card.step}</div>
                  <p className="text-[#4E3837]">{card.body}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[#2A1215]">
                Power BI Report Pages & Drill-Through Configuration
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-[#E7DDD1]">
                  <thead className="bg-[#FAF7F2] text-[#6E5A58]">
                    <tr>
                      <th className="p-2.5 text-left font-medium border-b border-[#E7DDD1]">Page</th>
                      <th className="p-2.5 text-left font-medium border-b border-[#E7DDD1]">Visual Components</th>
                      <th className="p-2.5 text-left font-medium border-b border-[#E7DDD1]">Slicers & Interactions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3ECE2]">
                    <tr>
                      <td className="p-2.5 font-medium text-[#5C162E]">1. Executive Overview</td>
                      <td className="p-2.5">6 KPI Cards, Dept Headcount Donut, Monthly Headcount & Attendance Line Chart</td>
                      <td className="p-2.5">Synced Department, Date Hierarchy & Work Mode slicers</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-[#5C162E]">2. Performance Analytics</td>
                      <td className="p-2.5">Quarterly KPI Trend, Rating Distribution Histogram, Individual Table</td>
                      <td className="p-2.5">Drill-through from Dept bar to Employee Detail page</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-[#5C162E]">3. Attendance & Leave</td>
                      <td className="p-2.5">Matrix Heatmap (Conditional Burgundy Palette), Leave Type Donut</td>
                      <td className="p-2.5">Cross-filter by Work Mode (Hybrid / Remote / On-Site)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-[#5C162E]">4. Turnover & Risk</td>
                      <td className="p-2.5">Hires vs Exits Line Chart, Exit Reason Pareto, ML Risk Table</td>
                      <td className="p-2.5">Separate bookmark clearly flagging Predictive vs Actuals</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <pre className="p-5 overflow-x-auto text-xs font-mono leading-relaxed text-[#FAF7F2] bg-[#2A0A14] max-h-[520px]">
            <code>{codeMap[activeTab].content}</code>
          </pre>
        )}
      </div>
    </div>
  );
};
