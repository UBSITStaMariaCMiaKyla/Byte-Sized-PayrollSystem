// src/app/salary/salary.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../login-page/auth.service';
import { ApiService } from '../api.service';

interface SalaryRow {
  Salary_id: number;
  Employee_id: number;
  monthly_salary: number;
  effective_date: string;
  emp_no: string;
  full_name: string;
  dept_name: string;
}

@Component({
  selector: 'app-salary',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './salary.component.html',
  styleUrl: './salary.component.css'
})
export class SalaryComponent implements OnInit {
  currentUser: User | null = null;
  dropdownOpen = false;
  showPrivacyModal = false;
  twoFactorEnabled = false;
  loginNotifications = true;
  dataSharing = false;

  salaryRows: SalaryRow[] = [];
  employees: any[] = [];

  showAddModal = false;
  addError = '';
  newRecord = this.blank();

  constructor(
    private authService: AuthService,
    private router: Router,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.currentUser = this.authService.getCurrentUser();
    this.api.getEmployees().subscribe({ next: (emps) => { this.employees = emps; } });
    this.load();
  }

  private load(): void {
    Promise.all([
      this.api.getSalaries().toPromise(),
      this.api.getEmployees().toPromise(),
      this.api.getDepartments(false).toPromise()
    ]).then(([salaries, emps, depts]) => {
      this.salaryRows = (salaries ?? []).map((s: any) => {
        const emp = (emps ?? []).find((e: any) => e.Employee_id === s.Employee_id);
        const dept = (depts ?? []).find((d: any) => d.Department_id === emp?.Department_id);
        return {
          ...s,
          emp_no: emp?.emp_no ?? '—',
          full_name: emp ? `${emp.last_name}, ${emp.first_name}` : '—',
          dept_name: dept?.name ?? '—'
        };
      }).sort((a: any, b: any) => b.effective_date.localeCompare(a.effective_date));
    });
  }

  private blank() {
    return {
      Employee_id: 0,
      monthly_salary: 0,
      effective_date: new Date().toISOString().slice(0, 10)
    };
  }

  openAdd(): void { this.newRecord = this.blank(); this.addError = ''; this.showAddModal = true; }
  closeAdd(): void { this.showAddModal = false; }

  save(): void {
    if (!this.newRecord.Employee_id) { this.addError = 'Select an employee.'; return; }
    if (this.newRecord.monthly_salary <= 0) { this.addError = 'Hourly rate must be greater than 0.'; return; }
    if (!this.newRecord.effective_date) { this.addError = 'Effective date is required.'; return; }

    this.api.addSalary({
      Employee_id: Number(this.newRecord.Employee_id),
      monthly_salary: Number(this.newRecord.monthly_salary),
      effective_date: this.newRecord.effective_date
    }).subscribe({
      next: (res) => {
        if (!res.success) { this.addError = res.message; return; }
        this.load();
        this.closeAdd();
      },
      error: () => { this.addError = 'Failed to save salary record. Please try again.'; }
    });
  }

  getInitials(): string {
    if (!this.currentUser) return '?';
    return ((this.currentUser.firstName?.[0] ?? '') + (this.currentUser.lastName?.[0] ?? '')).toUpperCase();
  }
  toggleDropdown(e: MouseEvent): void { e.stopPropagation(); this.dropdownOpen = !this.dropdownOpen; }
  closeDropdown(): void { this.dropdownOpen = false; }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
  openPrivacy(): void { this.dropdownOpen = false; this.showPrivacyModal = true; }
  closePrivacy(): void { this.showPrivacyModal = false; }
  savePrivacy(): void {
    localStorage.setItem('payroll_privacy_prefs', JSON.stringify({
      twoFactorEnabled: this.twoFactorEnabled,
      loginNotifications: this.loginNotifications,
      dataSharing: this.dataSharing
    }));
    alert('Saved!');
    this.closePrivacy();
  }
}