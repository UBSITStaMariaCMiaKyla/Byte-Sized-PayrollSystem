// src/app/app.routes.ts

import { Routes } from '@angular/router';
import { LoginPageComponent } from './login-page/login-page.component';
import { RegisterPageComponent } from './register-page/register-page.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { DepartmentComponent } from './department/department.component';

export const routes: Routes = [
  { path: '',           redirectTo: '/login', pathMatch: 'full' },
  { path: 'login',      component: LoginPageComponent },
  { path: 'register',   component: RegisterPageComponent },
  { path: 'dashboard',  component: DashboardComponent },
  { path: 'department/:deptId', component: DepartmentComponent },

  // Add these as you build them out:
  // { path: 'payroll',  component: PayrollComponent },
  // { path: 'payslip',  component: PayslipComponent },
  // { path: 'salary',   component: SalaryComponent },

  { path: '**', redirectTo: '/login' }
];
