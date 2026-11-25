# HR Analytics & Workforce Intelligence System

An interactive workforce analytics platform for exploring employee performance, attendance, retention, and predictive HR insights.

This project demonstrates how data analytics, statistical modeling, and machine learning can support data-driven workforce decision-making.

> **Project Type:** HR Analytics & Workforce Intelligence Prototype  
> **Data:** Synthetic HR Dataset  
> **Development Tool:** Google AI Studio + Visual Studio Code

---

## 📌 Project Overview

The HR Analytics & Workforce Intelligence System is an interactive analytics application designed to help users explore workforce metrics and understand HR trends through visual dashboards and predictive analytics.

The platform brings together employee data, attendance records, performance reviews, departmental information, and turnover events to provide a consolidated view of workforce intelligence.

It includes executive dashboards, detailed analytics modules, a sample data explorer, a relational data model, and an interactive machine learning laboratory.

The project was developed as a portfolio prototype using synthetic workforce data.

---

## ✨ Key Features

### 📊 Executive HR Overview
- Workforce headcount overview
- Active employee analysis
- Hiring and turnover metrics
- Workforce trends
- Department headcount distribution
- Attendance and performance KPIs
- Predictive attrition watchlist

### 👥 Employee Performance Analytics
- Quarterly performance review analysis
- KPI achievement tracking
- Employee performance distribution
- Individual employee drill-through
- Department performance comparisons

### 🕒 Attendance & Leave Analytics
- Attendance rate analysis
- Daily attendance visualization
- Late arrival analysis
- Leave utilization trends
- Attendance comparisons across departments

### 🏢 Department Intelligence
- Department headcount analysis
- Budgeted versus actual headcount
- Department scorecards
- KPI execution insights
- Department-level drill-through analysis

### 📉 Turnover & Retention Analytics
- Employee turnover analysis
- Retention rate monitoring
- Historical separation cohorts
- Exit driver analysis
- Attrition risk watchlist

### 🤖 Machine Learning & Forecasting Lab
- Logistic Regression for attrition risk estimation
- OLS-based workforce forecasting
- K-Means workforce clustering
- Model evaluation metrics
- ROC-AUC visualization
- Explainable feature weights
- Interactive attrition what-if simulator

### 🗂️ Sample Data Explorer
- Browse synthetic HR records
- Explore normalized data tables
- Generate additional sample employee batches
- Insert custom sample HR records
- Export filtered workforce records to CSV

### 🧱 Data Model & SQL
- Normalized relational data model
- Seven-table star/snowflake hybrid schema
- Primary and foreign key relationships
- MySQL 8.0 schema definition
- Analytical SQL queries

### 📦 Analytics Deliverables
- Synthetic CSV datasets
- Python analytics and machine learning examples
- DAX measures
- Power BI implementation guidance
- Database documentation

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React 19, TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Charts | Custom React SVG Charts |
| Icons | Lucide React |
| Animation | Motion |
| Data Processing | TypeScript |
| Machine Learning | Logistic Regression, OLS, K-Means |
| Database Design | MySQL 8.0 |
| Analytics | SQL, Python, Pandas, Scikit-learn |
| Business Intelligence | Power BI, DAX |
| Development | Google AI Studio, Visual Studio Code |

---

## 🧠 Machine Learning Approach

The project includes an interactive machine learning laboratory with several analytical techniques.

### 1. Logistic Regression – Attrition Risk

A logistic regression model estimates employee attrition risk using operational and behavioral features such as:

- Attendance rate
- Late arrival rate
- Performance rating
- KPI achievement
- Overtime hours
- Training hours
- Tenure
- Promotion history
- Commute distance

The implementation includes feature standardization, class weighting, a deterministic train/test split, and model evaluation.

### 2. OLS Workforce Forecasting

Ordinary Least Squares regression is used to demonstrate workforce trend forecasting based on historical workforce data.

### 3. K-Means Clustering

K-Means clustering is used to explore workforce segments based on selected employee attributes.

### 4. Model Evaluation

The ML laboratory provides metrics and visualizations including:

- Accuracy
- Precision
- Recall
- F1 Score
- ROC-AUC
- ROC Curve
- Feature weights

**Important:** The models are implemented as a prototype using synthetic data. Their results should not be interpreted as validated predictions for a real organization.

---

## 🗄️ Database Architecture

The project includes a normalized seven-table relational model designed for workforce analytics and Power BI integration.

### Data Model

| Table | Purpose |
|---|---|
| `dim_departments` | Department information and headcount targets |
| `dim_employees` | Employee master data |
| `dim_date` | Calendar and time intelligence |
| `fact_attendance` | Attendance records |
| `fact_performance` | Performance reviews |
| `fact_leave_records` | Employee leave records |
| `fact_employee_turnover` | Employee separation and turnover events |

The model uses dimension and fact tables with primary key and foreign key relationships.

The schema is designed to support analytical SQL queries and Power BI reporting.

---

## 📁 Project Structure

```text
HR-Analytics-Workforce-Intelligence/
│
├── src/
│   ├── components/
│   │   ├── views/
│   │   │   ├── ExecutiveOverview.tsx
│   │   │   ├── PerformanceAnalytics.tsx
│   │   │   ├── AttendanceAnalytics.tsx
│   │   │   ├── DepartmentAnalytics.tsx
│   │   │   ├── TurnoverAnalytics.tsx
│   │   │   ├── MlForecastingLab.tsx
│   │   │   ├── SampleDataView.tsx
│   │   │   ├── DataModelSqlView.tsx
│   │   │   └── DeliverablesHubView.tsx
│   │   │
│   │   ├── Charts.tsx
│   │   └── DrillThroughDrawer.tsx
│   │
│   ├── context/
│   │   └── HrDataContext.tsx
│   │
│   ├── data/
│   │   ├── syntheticHrData.ts
│   │   └── deliverablesContent.ts
│   │
│   ├── engine/
│   │   ├── hrAnalytics.ts
│   │   └── mlModels.ts
│   │
│   ├── types/
│   │   └── hr.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── index.html
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- Git
- Visual Studio Code

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

Navigate to the project directory:

```bash
cd HR-Analytics-Workforce-Intelligence
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root if required by the application.

```env
GEMINI_API_KEY=your_gemini_api_key
```

Never commit your real API key to GitHub.

### 4. Run the Development Server

```bash
npm run dev
```

Open the local URL displayed in your terminal.

The Vite development server is configured to use port `3000`.

### 5. Build for Production

```bash
npm run build
```

### 6. Preview the Production Build

```bash
npm run preview
```

### 7. TypeScript Check

```bash
npm run lint
```

---

## 📈 Business Intelligence & Power BI

The project includes SQL schema definitions, analytical queries, DAX content, and Power BI implementation guidance.

The proposed Power BI reporting solution can include:

- Executive Workforce Overview
- Employee Performance Analysis
- Attendance & Leave Analysis
- Department Scorecards
- Turnover & Retention Analysis
- Workforce Forecasting
- Data Quality Analysis

The relational data model is designed to support Power BI Import or DirectQuery workflows.

---

## 🔐 Data Privacy & Responsible Analytics

This project uses synthetic workforce data for demonstration and educational purposes.

No real employee records from an organization are included intentionally.

The attrition model uses selected operational and behavioral features and excludes protected demographic attributes from its scoring features.

Machine learning outputs are estimates, not definitive judgments about individual employees.

The platform should not be used for real employment decisions without appropriate data validation, fairness evaluation, privacy safeguards, and human oversight.

---

## ⚠️ Project Limitations

- The application currently uses synthetic HR data.
- Analytics are based on the included demonstration dataset.
- Machine learning models have not been validated on real organizational data.
- Database schema and analytical deliverables are provided as implementation resources.
- A live production HR database integration is not included in the current prototype.
- Power BI deployment and real organizational reporting require additional configuration.

---

## 🎯 Project Objectives

This project was developed to demonstrate practical skills in:

- Data analytics
- Workforce intelligence
- Interactive dashboard development
- Data modeling
- SQL database design
- Machine learning implementation
- Business intelligence
- Data-driven decision support

---

## 👩‍💻 Author

**Sammani Jayalath**

BSc (Hons) Computer Science Undergraduate

South Eastern University of Sri Lanka

LinkedIn: [www.linkedin.com/in/sammani-jayalath)

GitHub: [My GitHub Profile](https://github.com/jayalathsammanee-star)

---

## 🙌 Acknowledgements

Developed as an academic and portfolio project to explore the application of analytics and machine learning in Human Resource Management.

Google AI Studio was used as part of the development workflow.

---

⭐ If you find this project interesting, feel free to explore the repository and share your feedback.
