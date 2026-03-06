// src/app/services/database.service.ts
//
// This service is a localStorage-backed data layer that mirrors
// the bytesized_payroll_system MySQL schema exactly.
//
// Tables:
//   department      → Department_id (auto), name, active
//   employees       → Employee_id (auto), Department_id, emp_no, last_name,
//                     first_name, middle_name, gender, email
//   employee_salary → Salary_id (auto), Employee_id, monthly_salary, effective_date
//   payroll         → Payroll_id (auto), period_start, period_end, payroll_date
//   payslip         → Payslip_id (auto), Payroll_id, Employee_id,
//                     gross_pay, total_deductions, net_pay (computed)

import { Injectable } from '@angular/core';

// ── Interfaces (mirror DB columns) ───────────────────────────

export interface Department {
  Department_id: number;
  name: string;
  active: boolean;        // tinyint(1)
}

export interface Employee {
  Employee_id: number;
  Department_id: number;
  emp_no: string;
  last_name: string;
  first_name: string;
  middle_name: string | null;
  gender: 'Male' | 'Female' | 'Non-binary' | 'Prefer not to say';
  email: string;
}

export interface EmployeeSalary {
  Salary_id: number;
  Employee_id: number;
  monthly_salary: number;
  effective_date: string;   // ISO date string YYYY-MM-DD
}

export interface Payroll {
  Payroll_id: number;
  period_start: string;
  period_end: string;
  payroll_date: string;
}

export interface Payslip {
  Payslip_id: number;
  Payroll_id: number;
  Employee_id: number;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;          // computed: gross_pay - total_deductions
}

// ── Seed data ─────────────────────────────────────────────────

const SEED_DEPARTMENTS: Department[] = [
  { Department_id: 1, name: 'Accounting',      active: true },
  { Department_id: 2, name: 'IT',              active: true },
  { Department_id: 3, name: 'Human Resources', active: true },
];

// ── Storage keys ─────────────────────────────────────────────

const KEYS = {
  departments:      'bsp_departments',
  employees:        'bsp_employees',
  employee_salary:  'bsp_employee_salary',
  payroll:          'bsp_payroll',
  payslip:          'bsp_payslip',
  seq_dept:         'bsp_seq_dept',
  seq_emp:          'bsp_seq_emp',
  seq_salary:       'bsp_seq_salary',
  seq_payroll:      'bsp_seq_payroll',
  seq_payslip:      'bsp_seq_payslip',
};

@Injectable({ providedIn: 'root' })
export class DatabaseService {

  constructor() {
    this.seed();
  }

  // ── Auto-increment sequences ──────────────────────────────

  private nextId(key: string): number {
    const cur = parseInt(localStorage.getItem(key) ?? '0', 10);
    const next = cur + 1;
    localStorage.setItem(key, String(next));
    return next;
  }

  // ── Generic read/write helpers ────────────────────────────

  private read<T>(key: string): T[] {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }

  private write<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // ── Seed defaults (only on first run) ────────────────────

  private seed(): void {
    if (!localStorage.getItem(KEYS.departments)) {
      this.write(KEYS.departments, SEED_DEPARTMENTS);
      localStorage.setItem(KEYS.seq_dept, String(SEED_DEPARTMENTS.length));
    }
    if (!localStorage.getItem(KEYS.employees))       this.write(KEYS.employees, []);
    if (!localStorage.getItem(KEYS.employee_salary)) this.write(KEYS.employee_salary, []);
    if (!localStorage.getItem(KEYS.payroll))         this.write(KEYS.payroll, []);
    if (!localStorage.getItem(KEYS.payslip))         this.write(KEYS.payslip, []);
  }

  // ═══════════════════════════════════════════════════════════
  // DEPARTMENT
  // ═══════════════════════════════════════════════════════════

  getDepartments(activeOnly = true): Department[] {
    const all = this.read<Department>(KEYS.departments);
    return activeOnly ? all.filter(d => d.active) : all;
  }

  getDepartmentById(id: number): Department | undefined {
    return this.read<Department>(KEYS.departments).find(d => d.Department_id === id);
  }

  /** Returns null if name already exists (case-insensitive) */
  addDepartment(name: string): Department | null {
    const all = this.read<Department>(KEYS.departments);
    if (all.some(d => d.name.toLowerCase() === name.trim().toLowerCase() && d.active)) {
      return null;
    }
    const dept: Department = {
      Department_id: this.nextId(KEYS.seq_dept),
      name: name.trim(),
      active: true,
    };
    all.push(dept);
    this.write(KEYS.departments, all);
    return dept;
  }

  /** Soft-delete: set active = false (mirrors ON DELETE RESTRICT behaviour) */
  deactivateDepartment(id: number): boolean {
    const all = this.read<Department>(KEYS.departments);
    const idx = all.findIndex(d => d.Department_id === id);
    if (idx === -1) return false;
    all[idx].active = false;
    this.write(KEYS.departments, all);
    return true;
  }

  getEmployeeCountForDepartment(deptId: number): number {
    return this.read<Employee>(KEYS.employees)
      .filter(e => e.Department_id === deptId).length;
  }

  // ═══════════════════════════════════════════════════════════
  // EMPLOYEES
  // ═══════════════════════════════════════════════════════════

  getEmployees(): Employee[] {
    return this.read<Employee>(KEYS.employees);
  }

  getEmployeesByDept(deptId: number): Employee[] {
    return this.read<Employee>(KEYS.employees)
      .filter(e => e.Department_id === deptId);
  }

  getEmployeeById(id: number): Employee | undefined {
    return this.read<Employee>(KEYS.employees).find(e => e.Employee_id === id);
  }

  /** Returns null on duplicate emp_no or email */
  addEmployee(data: Omit<Employee, 'Employee_id' | 'emp_no'>): Employee | null {
    const all = this.read<Employee>(KEYS.employees);
    if (all.some(e => e.email.toLowerCase() === data.email.toLowerCase())) {
      return null;   // UNIQUE KEY email
    }
    const id   = this.nextId(KEYS.seq_emp);
    const empNo = `EMP-${String(id).padStart(5, '0')}`;
    const emp: Employee = { Employee_id: id, emp_no: empNo, ...data };
    all.push(emp);
    this.write(KEYS.employees, all);
    return emp;
  }

  removeEmployee(id: number): boolean {
    const all = this.read<Employee>(KEYS.employees);
    const filtered = all.filter(e => e.Employee_id !== id);
    if (filtered.length === all.length) return false;
    this.write(KEYS.employees, filtered);

    // Cascade: remove salary records (ON DELETE CASCADE)
    const salaries = this.read<EmployeeSalary>(KEYS.employee_salary)
      .filter(s => s.Employee_id !== id);
    this.write(KEYS.employee_salary, salaries);

    // Payslips: ON DELETE RESTRICT — just leave them (or optionally clean up)
    return true;
  }

  // ═══════════════════════════════════════════════════════════
  // EMPLOYEE_SALARY
  // ═══════════════════════════════════════════════════════════

  getSalaries(): EmployeeSalary[] {
    return this.read<EmployeeSalary>(KEYS.employee_salary);
  }

  getSalariesForEmployee(empId: number): EmployeeSalary[] {
    return this.read<EmployeeSalary>(KEYS.employee_salary)
      .filter(s => s.Employee_id === empId)
      .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  }

  /** Returns null on duplicate (Employee_id, effective_date) — mirrors UNIQUE KEY */
  addSalary(data: Omit<EmployeeSalary, 'Salary_id'>): EmployeeSalary | null {
    const all = this.read<EmployeeSalary>(KEYS.employee_salary);
    if (all.some(s =>
      s.Employee_id === data.Employee_id &&
      s.effective_date === data.effective_date
    )) return null;
    const record: EmployeeSalary = { Salary_id: this.nextId(KEYS.seq_salary), ...data };
    all.push(record);
    this.write(KEYS.employee_salary, all);
    return record;
  }

  /** Latest salary for an employee as of today */
  getCurrentSalary(empId: number): EmployeeSalary | undefined {
    const today = new Date().toISOString().slice(0, 10);
    return this.getSalariesForEmployee(empId)
      .find(s => s.effective_date <= today);
  }

  // ═══════════════════════════════════════════════════════════
  // PAYROLL
  // ═══════════════════════════════════════════════════════════

  getPayrolls(): Payroll[] {
    return this.read<Payroll>(KEYS.payroll)
      .sort((a, b) => b.payroll_date.localeCompare(a.payroll_date));
  }

  getPayrollById(id: number): Payroll | undefined {
    return this.read<Payroll>(KEYS.payroll).find(p => p.Payroll_id === id);
  }

  addPayroll(data: Omit<Payroll, 'Payroll_id'>): Payroll | null {
    // chk_payroll_period: period_end >= period_start
    if (data.period_end < data.period_start) return null;
    const record: Payroll = { Payroll_id: this.nextId(KEYS.seq_payroll), ...data };
    const all = this.read<Payroll>(KEYS.payroll);
    all.push(record);
    this.write(KEYS.payroll, all);
    return record;
  }

  deletePayroll(id: number): boolean {
    const all = this.read<Payroll>(KEYS.payroll);
    const filtered = all.filter(p => p.Payroll_id !== id);
    if (filtered.length === all.length) return false;
    this.write(KEYS.payroll, filtered);
    // Cascade: delete payslips (ON DELETE CASCADE)
    const slips = this.read<Payslip>(KEYS.payslip).filter(s => s.Payroll_id !== id);
    this.write(KEYS.payslip, slips);
    return true;
  }

  // ═══════════════════════════════════════════════════════════
  // PAYSLIP
  // ═══════════════════════════════════════════════════════════

  getPayslips(): Payslip[] {
    return this.read<Payslip>(KEYS.payslip);
  }

  getPayslipsByPayroll(payrollId: number): Payslip[] {
    return this.read<Payslip>(KEYS.payslip).filter(s => s.Payroll_id === payrollId);
  }

  getPayslipsByEmployee(empId: number): Payslip[] {
    return this.read<Payslip>(KEYS.payslip)
      .filter(s => s.Employee_id === empId)
      .sort((a, b) => b.Payslip_id - a.Payslip_id);
  }

  /** Returns null on duplicate (Payroll_id, Employee_id) — mirrors UNIQUE KEY */
  addPayslip(data: Omit<Payslip, 'Payslip_id' | 'net_pay'>): Payslip | null {
    const all = this.read<Payslip>(KEYS.payslip);
    if (all.some(s =>
      s.Payroll_id === data.Payroll_id &&
      s.Employee_id === data.Employee_id
    )) return null;
    const net_pay = Math.max(0, data.gross_pay - data.total_deductions);
    const record: Payslip = { Payslip_id: this.nextId(KEYS.seq_payslip), ...data, net_pay };
    all.push(record);
    this.write(KEYS.payslip, all);
    return record;
  }

  deletePayslip(id: number): boolean {
    const all = this.read<Payslip>(KEYS.payslip);
    const filtered = all.filter(s => s.Payslip_id !== id);
    if (filtered.length === all.length) return false;
    this.write(KEYS.payslip, filtered);
    return true;
  }
}
