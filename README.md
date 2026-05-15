# ByteSized Payroll System

A web-based payroll management system built for small to medium-sized BPO and staffing companies. It connects an Angular frontend to a MySQL database through a Node.js Express backend, allowing users to manage departments, employees, salary records, payroll periods, and payslips in real time.

---

## 👥 Group Members

- **Sta.Maria, Mia Kyla C.**
- **De Leon, Kimberly Louise M.**

---

## 🛠️ Tech Stack

- **Frontend:** Angular (Standalone Components)
- **Backend:** Node.js + Express
- **Database:** MySQL
- **Authentication:** JWT (JSON Web Tokens)

---

## 📋 Features

- User registration and login with JWT authentication
- Department management with deactivation support
- Employee management — add, edit, deactivate, and reactivate employees
- Salary record tracking with full history per employee
- Payroll period creation and management
- Payslip generation with auto-computed gross pay, deductions (SSS, PhilHealth, Pag-IBIG, tax), and net pay
- All records are preserved in the database — no permanent deletion

---

## ⚙️ Prerequisites

Make sure you have the following installed before running the project:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [MySQL](https://www.mysql.com/) (v8.0 or higher)
- [Angular CLI](https://angular.io/cli) (`npm install -g @angular/cli`)

---

## 🚀 How to Run

### Step 1 — Clone the Repository

```bash
git clone <your-repo-url>
cd Byte-Sized-PayrollSystem
```

### Step 2 — Set Up the Database

1. Open MySQL and run the following to create the database:

```sql
CREATE DATABASE IF NOT EXISTS bytesized_payroll_system;
USE bytesized_payroll_system;
source path/to/bytesized_payroll_system.sql;
```

2. If the `users` table is missing, create it manually:

```sql
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT          NOT NULL AUTO_INCREMENT,
  `first_name`    VARCHAR(50)  NOT NULL,
  `last_name`     VARCHAR(50)  NOT NULL,
  `email`         VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `company_code`  VARCHAR(50)  NOT NULL,
  `role`          VARCHAR(20)  NOT NULL DEFAULT 'employee',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_users_email` (`email` ASC)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;
```

### Step 3 — Configure Environment Variables

The `.env` file is already included in the project. Open it and fill in your MySQL credentials:

```
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=bytesized_payroll_system

JWT_SECRET=your_long_random_secret
JWT_EXPIRES_IN=8h

CORS_ORIGIN=http://localhost:4200
```

> ⚠️ Never commit your `.env` file to GitHub. It is already listed in `.gitignore`.

### Step 4 — Install Backend Dependencies

```bash
npm install
```

### Step 5 — Run the Backend Server

Open a terminal in the project root and run:

```bash
node server.js
```

You should see:
```
Payroll API running → http://localhost:3000
```

To verify the database connection, visit:
```
http://localhost:3000/api/health
```

It should return: `{"status":"ok","db":"connected"}`

### Step 6 — Run the Angular Frontend

Open a **second terminal** in the same project folder and run:

```bash
ng serve
```

Then open your browser and go to:
```
http://localhost:4200
```

> ⚠️ Both terminals must stay running at the same time for the app to work.

---

## 📁 Project Structure

```
Byte-Sized-PayrollSystem/
├── server.js               # Express backend API
├── .env                    # Environment variables (not committed)
├── _env                    # Environment variable template
├── .gitignore
├── package.json
├── bytesized_payroll_system.sql   # Database schema
└── src/
    └── app/
        ├── api.service.ts          # HTTP service connecting Angular to backend
        ├── app.config.ts           # Angular app configuration
        ├── app.routes.ts           # Application routes
        ├── login-page/
        │   ├── auth.service.ts     # Authentication logic
        │   └── login-page.component.*
        ├── register-page/
        │   └── register-page.component.*
        ├── dashboard/
        │   └── dashboard.component.*
        ├── department/
        │   └── department.component.*
        ├── payroll/
        │   └── payroll.component.*
        ├── payslip/
        │   └── payslip.component.*
        └── salary/
            └── salary.component.*
```

---

## 🗄️ Database Tables

| Table | Description |
|---|---|
| `users` | Stores login credentials and user roles |
| `department` | Stores department records with active/inactive status |
| `employees` | Stores employee information linked to departments |
| `employee_salary` | Tracks salary history per employee |
| `payroll` | Defines payroll periods (start date, end date, payroll date) |
| `payslip` | Stores payslip records with computed net pay |
| `attendance` | Tracks daily employee attendance |

---

## 🔐 Notes

- No records are permanently deleted in this system. Employees and departments can be deactivated and reactivated to preserve historical data.
- The `net_pay` column in the `payslip` table is a **generated column** — it is automatically computed by MySQL as `gross_pay - total_deductions`.
- JWT tokens expire after 8 hours. If you get a 401 Unauthorized error, clear your browser's localStorage and log in again.