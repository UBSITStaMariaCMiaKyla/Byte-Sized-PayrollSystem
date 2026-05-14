// src/app/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const BASE_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class ApiService {

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('payroll_token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── Auth ────────────────────────────────────────────────────
  register(payload: {
    firstName: string; lastName: string;
    email: string; password: string; companyCode: string;
  }): Observable<any> {
    return this.http.post(`${BASE_URL}/auth/register`, payload);
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${BASE_URL}/auth/login`, { email, password });
  }

  // ── Departments ─────────────────────────────────────────────
  getDepartments(activeOnly = true): Observable<any[]> {
    return this.http.get<any[]>(
      `${BASE_URL}/departments?activeOnly=${activeOnly}`,
      { headers: this.headers() }
    );
  }

  getDepartment(id: number): Observable<any> {
    return this.http.get<any>(`${BASE_URL}/departments/${id}`, { headers: this.headers() });
  }

  getDeptHeadcount(id: number): Observable<{ headcount: number }> {
    return this.http.get<{ headcount: number }>(
      `${BASE_URL}/departments/${id}/headcount`,
      { headers: this.headers() }
    );
  }

  addDepartment(name: string): Observable<any> {
    return this.http.post(`${BASE_URL}/departments`, { name }, { headers: this.headers() });
  }

  deactivateDepartment(id: number): Observable<any> {
    return this.http.patch(
      `${BASE_URL}/departments/${id}/deactivate`, {},
      { headers: this.headers() }
    );
  }

  // ── Employees ───────────────────────────────────────────────
  getEmployees(): Observable<any[]> {
    return this.http.get<any[]>(`${BASE_URL}/employees`, { headers: this.headers() });
  }

  getEmployeesByDept(deptId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${BASE_URL}/employees/by-dept/${deptId}`,
      { headers: this.headers() }
    );
  }

  addEmployee(emp: {
    Department_id: number; first_name: string; last_name: string;
    middle_name?: string; email: string; gender?: string;
  }): Observable<any> {
    return this.http.post(`${BASE_URL}/employees`, emp, { headers: this.headers() });
  }

  updateEmployee(id: number, data: {
    first_name: string; last_name: string;
    middle_name?: string; email: string; gender?: string;
  }): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(
      `${BASE_URL}/employees/${id}`, data, { headers: this.headers() }
    );
  }

  deleteEmployee(id: number): Observable<any> {
    return this.http.delete(`${BASE_URL}/employees/${id}`, { headers: this.headers() });
  }

  // ── Salaries ────────────────────────────────────────────────
  getSalaries(): Observable<any[]> {
    return this.http.get<any[]>(`${BASE_URL}/salaries`, { headers: this.headers() });
  }

  getSalariesForEmployee(empId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${BASE_URL}/salaries/employee/${empId}`,
      { headers: this.headers() }
    );
  }

  getCurrentSalary(empId: number): Observable<any> {
    return this.http.get<any>(
      `${BASE_URL}/salaries/employee/${empId}/current`,
      { headers: this.headers() }
    );
  }

  addSalary(payload: {
    Employee_id: number; monthly_salary: number; effective_date: string;
  }): Observable<any> {
    return this.http.post(`${BASE_URL}/salaries`, payload, { headers: this.headers() });
  }

  // ── Payroll ─────────────────────────────────────────────────
  getPayrolls(): Observable<any[]> {
    return this.http.get<any[]>(`${BASE_URL}/payrolls`, { headers: this.headers() });
  }

  addPayroll(payload: {
    period_start: string; period_end: string; payroll_date: string;
  }): Observable<any> {
    return this.http.post(`${BASE_URL}/payrolls`, payload, { headers: this.headers() });
  }

  deletePayroll(id: number): Observable<any> {
    return this.http.delete(`${BASE_URL}/payrolls/${id}`, { headers: this.headers() });
  }

  // ── Payslips ────────────────────────────────────────────────
  getPayslips(): Observable<any[]> {
    return this.http.get<any[]>(`${BASE_URL}/payslips`, { headers: this.headers() });
  }

  getPayslipsByPayroll(payrollId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${BASE_URL}/payslips/payroll/${payrollId}`,
      { headers: this.headers() }
    );
  }

  addPayslip(payload: {
    Payroll_id: number; Employee_id: number;
    gross_pay: number; total_deductions: number;
    hours_worked?: number | null; overtime_hours?: number | null;
    overtime_pay?: number | null; sss_deduction?: number | null;
    philhealth_deduction?: number | null; pagibig_deduction?: number | null;
    tax_deduction?: number | null;
  }): Observable<any> {
    return this.http.post(`${BASE_URL}/payslips`, payload, { headers: this.headers() });
  }

  deletePayslip(id: number): Observable<any> {
    return this.http.delete(`${BASE_URL}/payslips/${id}`, { headers: this.headers() });
  }

  // ── Health check ────────────────────────────────────────────
  healthCheck(): Observable<{ status: string; db: string }> {
    return this.http.get<{ status: string; db: string }>(`${BASE_URL}/health`);
  }
}