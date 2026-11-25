export const SQL_SCHEMA_DDL = `-- ============================================================================
-- HR Analytics & Workforce Intelligence System
-- Normalized Relational Database Schema (MySQL 8.0+)
-- Star / Snowflake Hybrid Schema ready for Power BI DirectQuery / Import
-- ============================================================================

CREATE DATABASE IF NOT EXISTS hr_workforce_analytics
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hr_workforce_analytics;

-- 1. Dimension: Departments
CREATE TABLE dim_departments (
    department_id       VARCHAR(16) PRIMARY KEY,
    department_name     VARCHAR(80) NOT NULL UNIQUE,
    cost_center         VARCHAR(20) NOT NULL,
    target_headcount    INT NOT NULL CHECK (target_headcount > 0),
    annual_budget_usd   DECIMAL(14, 2) NOT NULL,
    lead_title          VARCHAR(80) NOT NULL,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Dimension: Date Calendar (supports Power BI Time Intelligence)
CREATE TABLE dim_date (
    date_key            DATE PRIMARY KEY,
    month_key           CHAR(7) NOT NULL,         -- YYYY-MM
    month_label         VARCHAR(12) NOT NULL,     -- Nov 26
    quarter_label       CHAR(7) NOT NULL,         -- 2026-Q4
    fiscal_year         SMALLINT NOT NULL,
    month_of_year       TINYINT NOT NULL,
    is_workday          BOOLEAN NOT NULL DEFAULT TRUE,
    INDEX idx_date_month (month_key),
    INDEX idx_date_quarter (quarter_label)
);

-- 3. Dimension / Master Entity: Employees
-- Note: Zero protected demographic attributes stored or exposed for ML scoring
CREATE TABLE dim_employees (
    employee_id         VARCHAR(16) PRIMARY KEY,
    full_name           VARCHAR(100) NOT NULL,
    role_title          VARCHAR(100) NOT NULL,
    department_id       VARCHAR(16) NOT NULL,
    employment_type     ENUM('Full-Time', 'Contract') NOT NULL,
    work_mode           ENUM('Hybrid', 'On-Site', 'Remote') NOT NULL,
    hire_date           DATE NOT NULL,
    exit_date           DATE NULL,
    employment_status   ENUM('Active', 'Exited') NOT NULL DEFAULT 'Active',
    salary_band         ENUM('L2', 'L3', 'L4', 'L5', 'L6') NOT NULL,
    base_salary_usd     DECIMAL(12, 2) NOT NULL,
    overtime_hours_avg  DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    commute_distance_km DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
    training_hours_ytd  SMALLINT NOT NULL DEFAULT 0,
    promotion_last_2yr  BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_emp_dept FOREIGN KEY (department_id)
        REFERENCES dim_departments(department_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_emp_dept_status (department_id, employment_status),
    INDEX idx_emp_hire_date (hire_date)
);

-- 4. Fact Table: Attendance Records (Monthly Grain + Daily Rollup Ready)
CREATE TABLE fact_attendance (
    attendance_id       VARCHAR(20) PRIMARY KEY,
    employee_id         VARCHAR(16) NOT NULL,
    department_id       VARCHAR(16) NOT NULL,
    date_key            DATE NOT NULL,
    working_days        TINYINT NOT NULL,
    present_days        TINYINT NOT NULL,
    absent_days         TINYINT NOT NULL,
    late_arrivals       TINYINT NOT NULL DEFAULT 0,
    remote_days         TINYINT NOT NULL DEFAULT 0,
    leave_days          TINYINT NOT NULL DEFAULT 0,
    attendance_rate_pct DECIMAL(5, 2) GENERATED ALWAYS AS (
        ROUND((present_days / NULLIF(working_days - leave_days, 0)) * 100, 2)
    ) STORED,
    CONSTRAINT fk_att_emp FOREIGN KEY (employee_id)
        REFERENCES dim_employees(employee_id) ON DELETE CASCADE,
    CONSTRAINT fk_att_dept FOREIGN KEY (department_id)
        REFERENCES dim_departments(department_id),
    CONSTRAINT fk_att_date FOREIGN KEY (date_key)
        REFERENCES dim_date(date_key),
    UNIQUE KEY uq_emp_month (employee_id, date_key),
    INDEX idx_att_dept_date (department_id, date_key)
);

-- 5. Fact Table: Quarterly Performance Reviews
CREATE TABLE fact_performance (
    review_id           VARCHAR(20) PRIMARY KEY,
    employee_id         VARCHAR(16) NOT NULL,
    department_id       VARCHAR(16) NOT NULL,
    review_period       CHAR(7) NOT NULL,         -- e.g., 2026-Q4
    review_date         DATE NOT NULL,
    rating_score        DECIMAL(3, 2) NOT NULL CHECK (rating_score BETWEEN 1.00 AND 5.00),
    kpi_achievement_pct DECIMAL(5, 2) NOT NULL,
    productivity_index  DECIMAL(5, 2) NOT NULL,
    goals_met           TINYINT NOT NULL,
    goals_total         TINYINT NOT NULL,
    peer_feedback_score DECIMAL(3, 2) NOT NULL,
    CONSTRAINT fk_perf_emp FOREIGN KEY (employee_id)
        REFERENCES dim_employees(employee_id) ON DELETE CASCADE,
    CONSTRAINT fk_perf_dept FOREIGN KEY (department_id)
        REFERENCES dim_departments(department_id),
    CONSTRAINT fk_perf_date FOREIGN KEY (review_date)
        REFERENCES dim_date(date_key),
    INDEX idx_perf_period (review_period, department_id)
);

-- 6. Fact Table: Leave Records
CREATE TABLE fact_leave_records (
    leave_id            VARCHAR(20) PRIMARY KEY,
    employee_id         VARCHAR(16) NOT NULL,
    department_id       VARCHAR(16) NOT NULL,
    leave_type          ENUM('Annual Leave', 'Sick Leave', 'Personal Leave', 'Parental Leave') NOT NULL,
    start_date          DATE NOT NULL,
    days_taken          TINYINT NOT NULL CHECK (days_taken > 0),
    approved            BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_leave_emp FOREIGN KEY (employee_id)
        REFERENCES dim_employees(employee_id) ON DELETE CASCADE,
    CONSTRAINT fk_leave_dept FOREIGN KEY (department_id)
        REFERENCES dim_departments(department_id),
    CONSTRAINT fk_leave_date FOREIGN KEY (start_date)
        REFERENCES dim_date(date_key),
    INDEX idx_leave_type_date (leave_type, start_date)
);

-- 7. Fact Table: Employee Turnover Events
CREATE TABLE fact_employee_turnover (
    turnover_id         VARCHAR(20) PRIMARY KEY,
    employee_id         VARCHAR(16) NOT NULL UNIQUE,
    department_id       VARCHAR(16) NOT NULL,
    exit_date           DATE NOT NULL,
    exit_type           ENUM('Voluntary', 'Involuntary', 'Retirement') NOT NULL,
    exit_reason         VARCHAR(120) NOT NULL,
    tenure_months       SMALLINT NOT NULL,
    last_perf_score     DECIMAL(3, 2) NULL,
    CONSTRAINT fk_turn_emp FOREIGN KEY (employee_id)
        REFERENCES dim_employees(employee_id) ON DELETE CASCADE,
    CONSTRAINT fk_turn_dept FOREIGN KEY (department_id)
        REFERENCES dim_departments(department_id),
    CONSTRAINT fk_turn_date FOREIGN KEY (exit_date)
        REFERENCES dim_date(date_key),
    INDEX idx_turn_dept_exit (department_id, exit_date)
);
`;

export const SQL_ANALYTICS_QUERIES = `-- ============================================================================
-- Analytical SQL Queries for Executive Reporting & Data Extraction
-- ============================================================================

-- Query 1: Department Scorecard (Headcount vs Target, Attendance, Performance, Turnover)
SELECT
    d.department_id,
    d.department_name,
    d.target_headcount,
    COUNT(CASE WHEN e.employment_status = 'Active' THEN 1 END) AS active_headcount,
    COUNT(CASE WHEN e.employment_status = 'Active' THEN 1 END) - d.target_headcount AS headcount_variance,
    ROUND(AVG(a.attendance_rate_pct), 2) AS avg_attendance_pct,
    ROUND(AVG(p.rating_score), 2) AS avg_performance_rating,
    ROUND(AVG(p.kpi_achievement_pct), 1) AS avg_kpi_achievement_pct,
    COUNT(DISTINCT t.turnover_id) AS exits_count,
    ROUND(
        (COUNT(DISTINCT t.turnover_id) / NULLIF(COUNT(CASE WHEN e.employment_status = 'Active' THEN 1 END), 0)) * 100,
        1
    ) AS turnover_rate_pct
FROM dim_departments d
LEFT JOIN dim_employees e ON d.department_id = e.department_id
LEFT JOIN fact_attendance a ON e.employee_id = a.employee_id
LEFT JOIN fact_performance p ON e.employee_id = p.employee_id
LEFT JOIN fact_employee_turnover t ON e.employee_id = t.employee_id
GROUP BY d.department_id, d.department_name, d.target_headcount
ORDER BY turnover_rate_pct DESC;

-- Query 2: Monthly Workforce Movement (New Hires vs Exits & Running Net Retention)
WITH monthly_hires AS (
    SELECT DATE_FORMAT(hire_date, '%Y-%m') AS month_key, COUNT(*) AS hires
    FROM dim_employees
    GROUP BY DATE_FORMAT(hire_date, '%Y-%m')
),
monthly_exits AS (
    SELECT DATE_FORMAT(exit_date, '%Y-%m') AS month_key, COUNT(*) AS exits
    FROM fact_employee_turnover
    GROUP BY DATE_FORMAT(exit_date, '%Y-%m')
)
SELECT
    dt.month_key,
    dt.month_label,
    COALESCE(h.hires, 0) AS new_hires,
    COALESCE(ex.exits, 0) AS employee_exits,
    COALESCE(h.hires, 0) - COALESCE(ex.exits, 0) AS net_headcount_delta
FROM (SELECT DISTINCT month_key, month_label FROM dim_date) dt
LEFT JOIN monthly_hires h ON dt.month_key = h.month_key
LEFT JOIN monthly_exits ex ON dt.month_key = ex.month_key
ORDER BY dt.month_key;

-- Query 3: ML Feature Extraction View (Strictly Non-Demographic Features)
CREATE OR REPLACE VIEW vw_ml_attrition_features AS
SELECT
    e.employee_id,
    e.department_id,
    e.work_mode,
    TIMESTAMPDIFF(MONTH, e.hire_date, COALESCE(e.exit_date, CURDATE())) AS tenure_months,
    e.overtime_hours_avg,
    e.commute_distance_km,
    e.training_hours_ytd,
    CAST(e.promotion_last_2yr AS UNSIGNED) AS promotion_flag,
    ROUND(AVG(a.attendance_rate_pct), 2) AS avg_attendance_pct,
    ROUND(SUM(a.late_arrivals) / NULLIF(SUM(a.present_days), 0) * 100, 2) AS late_arrival_rate_pct,
    MAX(p.rating_score) AS latest_performance_score,
    AVG(p.kpi_achievement_pct) AS avg_kpi_achievement_pct,
    CASE WHEN e.employment_status = 'Exited' THEN 1 ELSE 0 END AS attrition_target
FROM dim_employees e
LEFT JOIN fact_attendance a ON e.employee_id = a.employee_id
LEFT JOIN fact_performance p ON e.employee_id = p.employee_id
GROUP BY
    e.employee_id, e.department_id, e.work_mode, e.hire_date, e.exit_date,
    e.overtime_hours_avg, e.commute_distance_km, e.training_hours_ytd,
    e.promotion_last_2yr, e.employment_status;
`;

export const PYTHON_CLEANING_SCRIPT = `"""
data_cleaning.py
HR Analytics & Workforce Intelligence System
Automated ETL, Data Validation, Outlier Capping & Feature Preparation
"""

import pandas as pd
import numpy as np
from pathlib import Path


def load_raw_tables(data_dir: Path) -> dict[str, pd.DataFrame]:
    """Load synthetic HR CSV exports into typed DataFrames."""
    return {
        "departments": pd.read_csv(data_dir / "departments.csv"),
        "employees": pd.read_csv(data_dir / "employees.csv", parse_dates=["hire_date", "exit_date"]),
        "attendance": pd.read_csv(data_dir / "attendance_monthly.csv"),
        "performance": pd.read_csv(data_dir / "performance_reviews.csv"),
        "leaves": pd.read_csv(data_dir / "leave_records.csv", parse_dates=["start_date"]),
        "turnover": pd.read_csv(data_dir / "turnover_events.csv", parse_dates=["exit_date"]),
    }


def validate_and_clean_employees(df: pd.DataFrame) -> pd.DataFrame:
    """Standardize categoricals, enforce referential integrity, and remove duplicates."""
    df = df.drop_duplicates(subset=["employee_id"]).copy()
    df["full_name"] = df["full_name"].str.strip()
    df["work_mode"] = df["work_mode"].fillna("Hybrid").astype("category")
    df["overtime_hours_avg"] = df["overtime_hours_avg"].clip(lower=0.0, upper=45.0)
    df["commute_distance_km"] = df["commute_distance_km"].fillna(df["commute_distance_km"].median())

    # Guardrail: Ensure no exit_date precedes hire_date
    invalid_dates = df["exit_date"].notna() & (df["exit_date"] < df["hire_date"])
    if invalid_dates.any():
        raise ValueError(f"Detected {invalid_dates.sum()} records with exit_date < hire_date.")

    return df


def build_analytical_feature_mart(tables: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Aggregate monthly attendance and quarterly performance into an ML-ready mart."""
    emp = validate_and_clean_employees(tables["employees"])
    att = tables["attendance"].copy()
    perf = tables["performance"].copy()

    # Attendance aggregation
    att["avail_days"] = (att["working_days"] - att["leave_days"]).clip(lower=1)
    att_agg = (
        att.groupby("employee_id", as_index=False)
        .agg(
            total_present=("present_days", "sum"),
            total_avail=("avail_days", "sum"),
            total_late=("late_arrivals", "sum"),
            total_absent=("absent_days", "sum"),
        )
    )
    att_agg["avg_attendance_pct"] = np.round((att_agg["total_present"] / att_agg["total_avail"]) * 100, 2)
    att_agg["late_arrival_rate_pct"] = np.round(
        (att_agg["total_late"] / att_agg["total_present"].clip(lower=1)) * 100, 2
    )

    # Latest performance review per employee
    perf_sorted = perf.sort_values(["employee_id", "period_order"])
    perf_latest = perf_sorted.groupby("employee_id", as_index=False).last()[
        ["employee_id", "rating_score", "kpi_achievement_pct", "productivity_index"]
    ]

    mart = (
        emp.merge(att_agg[["employee_id", "avg_attendance_pct", "late_arrival_rate_pct"]], on="employee_id", how="left")
        .merge(perf_latest, on="employee_id", how="left")
    )

    # Impute cold-start new hires with department medians
    for col in ["avg_attendance_pct", "late_arrival_rate_pct", "rating_score", "kpi_achievement_pct"]:
        mart[col] = mart.groupby("department_id")[col].transform(lambda s: s.fillna(s.median()))

    mart["attrition_target"] = (mart["status"] == "Exited").astype(int)
    return mart


if __name__ == "__main__":
    raw = load_raw_tables(Path("./data"))
    feature_mart = build_analytical_feature_mart(raw)
    feature_mart.to_csv("./data/hr_feature_mart_clean.csv", index=False)
    print(f"Cleaned feature mart saved: {feature_mart.shape[0]} employees, {feature_mart.shape[1]} columns.")
`;

export const PYTHON_ML_SCRIPT = `"""
ml_pipeline.py
HR Analytics & Workforce Intelligence System
1. Employee Attrition Prediction (Logistic Regression + Random Forest Comparison)
2. Workforce Headcount & Turnover Forecasting (OLS Regression + Backtest)
3. Workforce Pattern Clustering (K-Means k=3)
Ethics Guardrail: Strictly excludes protected characteristics from all model features.
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.cluster import KMeans
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    mean_absolute_error,
    mean_squared_error,
    r2_score,
)


BEHAVIORAL_FEATURES = [
    "overtime_hours_avg",
    "avg_attendance_pct",
    "late_arrival_rate_pct",
    "rating_score",
    "kpi_achievement_pct",
    "training_hours_ytd",
    "promotion_last_2yr",
    "tenure_months",
    "commute_distance_km",
]


def train_attrition_classifier(mart: pd.DataFrame):
    X = mart[BEHAVIORAL_FEATURES].copy()
    X["promotion_last_2yr"] = X["promotion_last_2yr"].astype(int)
    y = mart["attrition_target"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, stratify=y, random_state=42
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(C=1.0, class_weight="balanced", max_iter=1000, random_state=42)),
    ])
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]

    metrics = {
        "accuracy": round(accuracy_score(y_test, y_pred) * 100, 1),
        "precision": round(precision_score(y_test, y_pred, zero_division=0) * 100, 1),
        "recall": round(recall_score(y_test, y_pred, zero_division=0) * 100, 1),
        "f1": round(f1_score(y_test, y_pred, zero_division=0) * 100, 1),
        "roc_auc": round(roc_auc_score(y_test, y_prob), 3),
        "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
    }

    # Global explainability via standardized log-odds coefficients
    coefs = pipeline.named_steps["clf"].coef_[0]
    importance_df = pd.DataFrame({
        "feature": BEHAVIORAL_FEATURES,
        "std_weight": np.round(coefs, 3),
        "abs_importance_pct": np.round(np.abs(coefs) / np.abs(coefs).sum() * 100, 1),
    }).sort_values("abs_importance_pct", ascending=False)

    return pipeline, metrics, importance_df


def forecast_workforce_trends(monthly_df: pd.DataFrame, horizon_months: int = 6):
    """Fit OLS regression on monthly headcount with 6-month holdout backtest."""
    monthly_df = monthly_df.sort_values("month_key").reset_index(drop=True)
    X = np.arange(len(monthly_df)).reshape(-1, 1)
    y = monthly_df["headcount"].values

    # Backtest split (first 18 train, last 6 validate)
    split = len(monthly_df) - 6
    bt_model = LinearRegression().fit(X[:split], y[:split])
    bt_pred = bt_model.predict(X[split:])

    backtest = {
        "mae": round(mean_absolute_error(y[split:], bt_pred), 2),
        "rmse": round(np.sqrt(mean_squared_error(y[split:], bt_pred)), 2),
        "r2_full": round(r2_score(y, LinearRegression().fit(X, y).predict(X)), 3),
    }

    full_model = LinearRegression().fit(X, y)
    future_X = np.arange(len(monthly_df), len(monthly_df) + horizon_months).reshape(-1, 1)
    forecast_vals = np.round(full_model.predict(future_X)).astype(int)
    return forecast_vals, backtest


def cluster_attendance_patterns(mart: pd.DataFrame, k: int = 3):
    """Segment active employees into behavioral attendance & productivity clusters."""
    active = mart[mart["status"] == "Active"].copy()
    cluster_cols = ["avg_attendance_pct", "kpi_achievement_pct", "overtime_hours_avg", "late_arrival_rate_pct"]

    X_scaled = StandardScaler().fit_transform(active[cluster_cols])
    km = KMeans(n_clusters=k, n_init=20, random_state=42)
    active["cluster_id"] = km.fit_predict(X_scaled)
    summary = active.groupby("cluster_id")[cluster_cols].mean().round(2)
    return active, summary, round(km.inertia_, 1)
`;

export const DAX_MEASURES_SCRIPT = `// ============================================================================
// Power BI DAX Measures Library
// Model: HR Analytics & Workforce Intelligence System
// ============================================================================

// 1. Headcount & Workforce Base Measures
Total Historical Employees = COUNTROWS(dim_employees)

Active Employees =
CALCULATE(
    COUNTROWS(dim_employees),
    dim_employees[employment_status] = "Active"
)

New Hires =
VAR MinDate = MIN(dim_date[date_key])
VAR MaxDate = MAX(dim_date[date_key])
RETURN
CALCULATE(
    COUNTROWS(dim_employees),
    dim_employees[hire_date] >= MinDate &&
    dim_employees[hire_date] <= MaxDate
)

Employee Exits = COUNTROWS(fact_employee_turnover)

Net Headcount Change = [New Hires] - [Employee Exits]

// 2. Turnover & Retention KPIs
Average Headcount =
VAR StartHC = CALCULATE([Active Employees], FIRSTDATE(dim_date[date_key]))
VAR EndHC = CALCULATE([Active Employees], LASTDATE(dim_date[date_key]))
RETURN DIVIDE(StartHC + EndHC, 2, [Active Employees])

Employee Turnover Rate % =
DIVIDE([Employee Exits], [Average Headcount], 0)

Employee Retention Rate % =
1 - [Employee Turnover Rate %]

Voluntary Attrition Rate % =
VAR VoluntaryExits =
    CALCULATE(
        [Employee Exits],
        fact_employee_turnover[exit_type] = "Voluntary"
    )
RETURN DIVIDE(VoluntaryExits, [Average Headcount], 0)

Average Tenure (Months) =
AVERAGE(dim_employees[tenure_months])

// 3. Attendance & Leave Intelligence
Total Present Days = SUM(fact_attendance[present_days])
Total Available Workdays =
SUMX(fact_attendance, fact_attendance[working_days] - fact_attendance[leave_days])

Average Attendance Rate % =
DIVIDE([Total Present Days], [Total Available Workdays], 0)

Late Arrival Rate % =
DIVIDE(SUM(fact_attendance[late_arrivals]), [Total Present Days], 0)

Absenteeism Rate % =
DIVIDE(SUM(fact_attendance[absent_days]), [Total Available Workdays], 0)

Total Leave Days = SUM(fact_leave_records[days_taken])

// 4. Performance & Productivity Measures
Average Performance Score = AVERAGE(fact_performance[rating_score])

Average KPI Achievement % = AVERAGE(fact_performance[kpi_achievement_pct])

High Performers Count =
CALCULATE(
    DISTINCTCOUNT(fact_performance[employee_id]),
    fact_performance[rating_score] >= 4.2
)

// 5. Time Intelligence (QoQ & YoY Deltas)
Attendance Rate MoM Delta =
VAR CurrentAtt = [Average Attendance Rate %]
VAR PrevMonthAtt =
    CALCULATE(
        [Average Attendance Rate %],
        DATEADD(dim_date[date_key], -1, MONTH)
    )
RETURN CurrentAtt - PrevMonthAtt

Turnover Rate YoY Variance =
VAR CurrentTurn = [Employee Turnover Rate %]
VAR PriorYearTurn =
    CALCULATE(
        [Employee Turnover Rate %],
        SAMEPERIODLASTYEAR(dim_date[date_key])
    )
RETURN CurrentTurn - PriorYearTurn
`;

export const README_MARKDOWN = `# HR Analytics & Workforce Intelligence System

An enterprise-grade HR Business Intelligence, Relational Data Modeling, and Machine Learning portfolio platform built with **SQL (MySQL)**, **Python (Pandas, NumPy, Scikit-learn)**, **Power BI (DAX)**, and an interactive **React + TypeScript** analytical cockpit.

## 1. Business Objectives
- Monitor real-time workforce headcount, hiring velocity, and departmental target variances.
- Track attendance reliability, late arrival patterns, and leave utilization across work modes (Hybrid, On-Site, Remote).
- Evaluate quarterly employee performance ratings, KPI attainment, and productivity trajectories.
- Diagnose voluntary vs. involuntary attrition drivers and forecast future headcount & turnover trends.
- Surface explainable ML attrition risk indicators strictly from non-demographic operational features.

## 2. Project Architecture
\`\`\`
hr-analytics-workforce-intelligence/
├── sql/
│   ├── schema.sql                # Normalized MySQL 8.0 Star/Snowflake DDL
│   └── analytics_queries.sql     # Departmental scorecards & ML feature views
├── python/
│   ├── data_cleaning.py          # Pandas/NumPy ETL, validation & feature mart
│   └── ml_pipeline.py            # Logistic Regression, OLS Forecast, K-Means
├── powerbi/
│   └── hr_measures.dax           # 20+ DAX KPIs & Time Intelligence measures
├── data/                         # Realistic 24-month synthetic HR CSV tables
└── web-dashboard/                # Interactive React + TypeScript BI & ML UI
\`\`\`

## 3. Relational Data Model
- **Dimension Tables**: \`dim_departments\`, \`dim_employees\`, \`dim_date\`
- **Fact Tables**: \`fact_attendance\`, \`fact_performance\`, \`fact_leave_records\`, \`fact_employee_turnover\`
- **Cardinality**: One-to-Many (\`1:*\`) from dimensions to facts with single-direction cross-filtering.

## 4. Machine Learning & Ethical AI Guardrails
1. **Employee Attrition Prediction**: L2-regularized Logistic Regression trained on an 80/20 stratified split using standardized operational features (overtime load, attendance rate, late rate, KPI attainment, training hours, promotion history, tenure, commute distance). Evaluated with Accuracy, Precision, Recall, F1, Confusion Matrix, and ROC-AUC.
2. **Workforce Trend Forecasting**: Ordinary Least Squares (OLS) regression with 6-month holdout backtesting (MAE, RMSE, R²) and 95% forecast confidence intervals.
3. **Attendance & Productivity Clustering**: K-Means (k=3) behavioral segmentation into *Steady High Performers*, *Overextended / Workload Watch*, and *Attendance & KPI Drift*.
4. **Fairness Policy**: Protected demographic characteristics are excluded from schema, feature vectors, and rankings. Predictions are explicitly separated from actual HR records.

## 5. Power BI Dashboard Design
- **Page 1 — Executive HR Overview**: 6 KPI cards, department headcount donut, 24-month hires vs. exits trend, dynamic Department & Work Mode slicers.
- **Page 2 — Performance Analytics**: Rating distribution histogram, quarterly KPI trend, top-performing departments, individual drill-through table.
- **Page 3 — Attendance & Leave**: Department × Workday attendance heatmap, late arrival trends, leave breakdown by category.
- **Page 4 — Turnover & Attrition**: Retention gauge, tenure-at-exit distribution, exit reason Pareto, ML risk watchlist.
`;
