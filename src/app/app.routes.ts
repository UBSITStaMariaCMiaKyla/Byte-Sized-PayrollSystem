// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  // ── Auth ────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () =>
      import('./login-page/login-page.component').then(m => m.LoginPageComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./register-page/register-page.component').then(m => m.RegisterPageComponent)
  },

  // ── Dashboard ────────────────────────────────────────────
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
  },

  // ── Department (receives :deptId = Department_id) ────────
  {
    path: 'department/:deptId',
    loadComponent: () =>
      import('./department/department.component').then(m => m.DepartmentComponent)
  },

  // ── Payroll (payroll periods) ────────────────────────────
  {
    path: 'payroll',
    loadComponent: () =>
      import('./payroll/payroll.component').then(m => m.PayrollComponent)
  },

  // ── Payslip ──────────────────────────────────────────────
  {
    path: 'payslip',
    loadComponent: () =>
      import('./payslip/payslip.component').then(m => m.PayslipComponent)
  },

  // ── Salary ───────────────────────────────────────────────
  {
    path: 'salary',
    loadComponent: () =>
      import('./salary/salary.component').then(m => m.SalaryComponent)
  },

  // ── Default redirect ─────────────────────────────────────
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' }
];
