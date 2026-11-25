import React, { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { SQL_ANALYTICS_QUERIES, SQL_SCHEMA_DDL } from '../../data/deliverablesContent';

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

const TABLES_METADATA = [
  {
    name: 'dim_departments',
    kind: 'Dimension',
    pk: 'department_id',
    fks: '—',
    cols: 'department_name, cost_center, target_headcount, annual_budget_usd, lead_title',
    rows: '6 departments',
  },
  {
    name: 'dim_employees',
    kind: 'Dimension',
    pk: 'employee_id',
    fks: 'department_id -> dim_departments',
    cols: 'full_name, role_title, employment_type, work_mode, hire_date, exit_date, status, salary_band, overtime_hours_avg',
    rows: '342 historical & active',
  },
  {
    name: 'dim_date',
    kind: 'Dimension',
    pk: 'date_key',
    fks: '—',
    cols: 'month_key, month_label, quarter_label, fiscal_year, month_of_year, is_workday',
    rows: '24 monthly grain keys',
  },
  {
    name: 'fact_attendance',
    kind: 'Fact',
    pk: 'attendance_id',
    fks: 'employee_id, department_id, date_key',
    cols: 'working_days, present_days, absent_days, late_arrivals, remote_days, leave_days, attendance_rate_pct (generated)',
    rows: '~6,900 monthly records',
  },
  {
    name: 'fact_performance',
    kind: 'Fact',
    pk: 'review_id',
    fks: 'employee_id, department_id, review_date',
    cols: 'review_period, rating_score, kpi_achievement_pct, productivity_index, goals_met, goals_total, peer_feedback_score',
    rows: '~2,200 quarterly reviews',
  },
  {
    name: 'fact_leave_records',
    kind: 'Fact',
    pk: 'leave_id',
    fks: 'employee_id, department_id, start_date',
    cols: 'leave_type, start_date, days_taken, approved',
    rows: '~1,600 leave logs',
  },
  {
    name: 'fact_employee_turnover',
    kind: 'Fact',
    pk: 'turnover_id',
    fks: 'employee_id (UQ), department_id, exit_date',
    cols: 'exit_date, exit_type, exit_reason, tenure_months, last_perf_score',
    rows: 'Recorded exits',
  },
];

export const DataModelSqlView: React.FC = () => {
  const [sqlTab, setSqlTab] = useState<'ddl' | 'queries'>('ddl');
  const [copied, setCopied] = useState(false);

  const activeSql = sqlTab === 'ddl' ? SQL_SCHEMA_DDL : SQL_ANALYTICS_QUERIES;
  const activeFilename = sqlTab === 'ddl' ? 'schema.sql' : 'analytics_queries.sql';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Star Schema ER Diagram */}
      <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-[#2A1215]">
              Normalized Star / Snowflake Data Model & Relationships
            </h3>
            <p className="text-xs text-[#6E5A58] mt-0.5">
              MySQL 8.0 & Power BI relational model with 1:* single-direction cardinality from Dimensions to Fact tables
            </p>
          </div>
          <span className="text-xs font-mono text-[#5C162E]">7 Normalized Tables</span>
        </div>

        <div className="overflow-x-auto pb-2">
          <svg
            viewBox="0 0 880 330"
            className="w-full min-w-[720px] h-auto"
            role="img"
            aria-label="Entity Relationship Diagram"
          >
            {/* Connector Lines (1 -> *) */}
            <g stroke="#B76E79" strokeWidth={1.6} fill="none">
              {/* dim_departments -> dim_employees */}
              <path d="M 210 74 L 330 74" />
              {/* dim_departments -> facts */}
              <path d="M 115 118 L 115 210" />
              <path d="M 115 170 L 340 170 L 340 210" />
              <path d="M 115 170 L 560 170 L 560 210" />
              <path d="M 115 170 L 765 170 L 765 210" />
              {/* dim_employees -> facts */}
              <path d="M 440 118 L 440 150 L 135 150 L 135 210" />
              <path d="M 440 118 L 440 150 L 360 150 L 360 210" />
              <path d="M 440 118 L 440 150 L 580 150 L 580 210" />
              <path d="M 440 118 L 440 150 L 785 150 L 785 210" />
              {/* dim_date -> facts */}
              <path d="M 750 118 L 750 190 L 155 190 L 155 210" strokeDasharray="4 3" />
              <path d="M 750 118 L 750 190 L 380 190 L 380 210" strokeDasharray="4 3" />
              <path d="M 750 118 L 750 190 L 600 190 L 600 210" strokeDasharray="4 3" />
              <path d="M 750 118 L 750 190 L 805 190 L 805 210" strokeDasharray="4 3" />
            </g>

            {/* Dimension Boxes */}
            {[
              {
                x: 20,
                y: 22,
                w: 190,
                title: 'dim_departments (1)',
                pk: 'PK: department_id',
                sub: 'cost_center, target_headcount',
              },
              {
                x: 330,
                y: 22,
                w: 220,
                title: 'dim_employees (1)',
                pk: 'PK: employee_id | FK: department_id',
                sub: 'hire_date, work_mode, overtime_avg',
              },
              {
                x: 650,
                y: 22,
                w: 200,
                title: 'dim_date (1)',
                pk: 'PK: date_key',
                sub: 'month_key, quarter, fiscal_year',
              },
            ].map((box) => (
              <g key={box.title}>
                <rect
                  x={box.x}
                  y={box.y}
                  width={box.w}
                  height={96}
                  rx={8}
                  fill="#FFFDF9"
                  stroke="#5C162E"
                  strokeWidth={1.6}
                />
                <rect x={box.x} y={box.y} width={box.w} height={28} rx={8} fill="#5C162E" />
                <text
                  x={box.x + 12}
                  y={box.y + 18}
                  className="fill-[#FAF7F2] text-[11px] font-semibold font-mono"
                >
                  {box.title}
                </text>
                <text x={box.x + 12} y={box.y + 50} className="fill-[#2A1215] text-[10px] font-mono">
                  {box.pk}
                </text>
                <text x={box.x + 12} y={box.y + 72} className="fill-[#6E5A58] text-[10px]">
                  {box.sub}
                </text>
              </g>
            ))}

            {/* Fact Boxes */}
            {[
              {
                x: 20,
                title: 'fact_attendance (*)',
                pk: 'PK: attendance_id',
                fk: 'FK: employee_id, dept_id, date_key',
                cols: 'present, absent, late, rate_pct',
              },
              {
                x: 240,
                title: 'fact_performance (*)',
                pk: 'PK: review_id',
                fk: 'FK: employee_id, dept_id, date_key',
                cols: 'rating_score, kpi_pct, goals_met',
              },
              {
                x: 460,
                title: 'fact_leave_records (*)',
                pk: 'PK: leave_id',
                fk: 'FK: employee_id, dept_id, date_key',
                cols: 'leave_type, days_taken, approved',
              },
              {
                x: 680,
                title: 'fact_employee_turnover (*)',
                pk: 'PK: turnover_id',
                fk: 'FK: employee_id, dept_id, exit_date',
                cols: 'exit_type, exit_reason, tenure_mo',
              },
            ].map((f) => (
              <g key={f.title}>
                <rect
                  x={f.x}
                  y={210}
                  width={185}
                  height={102}
                  rx={8}
                  fill="#FFFDF9"
                  stroke="#B76E79"
                  strokeWidth={1.5}
                />
                <rect x={f.x} y={210} width={185} height={28} rx={8} fill="#B76E79" />
                <text
                  x={f.x + 10}
                  y={228}
                  className="fill-[#FFFDF9] text-[10.5px] font-semibold font-mono"
                >
                  {f.title}
                </text>
                <text x={f.x + 10} y={254} className="fill-[#2A1215] text-[9.5px] font-mono">
                  {f.pk}
                </text>
                <text x={f.x + 10} y={272} className="fill-[#5C162E] text-[9.5px] font-mono">
                  {f.fk}
                </text>
                <text x={f.x + 10} y={292} className="fill-[#6E5A58] text-[9.5px]">
                  {f.cols}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Table Schema Dictionary */}
      <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl p-5 space-y-3">
        <h3 className="text-base font-semibold text-[#2A1215]">Relational Table Dictionary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#E7DDD1] text-[#6E5A58]">
                <th className="py-2 text-left font-medium">Table Name</th>
                <th className="py-2 text-left font-medium">Type</th>
                <th className="py-2 text-left font-medium">Primary Key</th>
                <th className="py-2 text-left font-medium">Foreign Keys</th>
                <th className="py-2 text-left font-medium">Key Columns</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3ECE2]">
              {TABLES_METADATA.map((t) => (
                <tr key={t.name}>
                  <td className="py-2.5 font-mono font-medium text-[#5C162E]">{t.name}</td>
                  <td className="py-2.5 text-[#2A1215]">{t.kind}</td>
                  <td className="py-2.5 font-mono text-[#2A1215]">{t.pk}</td>
                  <td className="py-2.5 font-mono text-[#6E5A58]">{t.fks}</td>
                  <td className="py-2.5 text-[#4E3837]">{t.cols}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SQL Script Viewer */}
      <div className="bg-[#FFFDF9] border border-[#E7DDD1] rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#E7DDD1] flex flex-wrap items-center justify-between gap-3 bg-[#FAF7F2]">
          <div className="flex items-center gap-1 p-1 bg-[#EAE0D5] rounded-lg">
            <button
              type="button"
              onClick={() => setSqlTab('ddl')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                sqlTab === 'ddl'
                  ? 'bg-[#FFFDF9] text-[#5C162E]'
                  : 'text-[#4E3837] hover:text-[#2A1215]'
              }`}
            >
              MySQL Schema DDL (schema.sql)
            </button>
            <button
              type="button"
              onClick={() => setSqlTab('queries')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                sqlTab === 'queries'
                  ? 'bg-[#FFFDF9] text-[#5C162E]'
                  : 'text-[#4E3837] hover:text-[#2A1215]'
              }`}
            >
              Analytical Queries (analytics_queries.sql)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7DDD1] bg-[#FFFDF9] text-xs font-medium text-[#2A1215] hover:border-[#B76E79] transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#2D6A4F]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy SQL'}</span>
            </button>
            <button
              type="button"
              onClick={() => downloadTextFile(activeFilename, activeSql)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5C162E] text-xs font-medium text-[#FAF7F2] hover:bg-[#75203C] transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {activeFilename}</span>
            </button>
          </div>
        </div>

        <pre className="p-5 overflow-x-auto text-xs font-mono leading-relaxed text-[#FAF7F2] bg-[#2A0A14] max-h-[480px]">
          <code>{activeSql}</code>
        </pre>
      </div>
    </div>
  );
};
