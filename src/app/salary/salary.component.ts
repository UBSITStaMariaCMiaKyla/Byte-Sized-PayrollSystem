// src/app/salary/salary.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../login-page/auth.service';
import { DatabaseService, Employee, EmployeeSalary } from '../database.service';

interface SalaryRow extends EmployeeSalary {
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
  employees: Employee[] = [];

  showAddModal = false;
  addError = '';
  newRecord = this.blank();

  constructor(
    private authService: AuthService,
    private router: Router,
    private db: DatabaseService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.currentUser = this.authService.getCurrentUser();
    this.employees = this.db.getEmployees();
    this.load();
  }

  private load(): void {
    const depts = this.db.getDepartments(false);
    this.salaryRows = this.db.getSalaries()
      .map(s => {
        const emp = this.db.getEmployeeById(s.Employee_id);
        const dept = depts.find(d => d.Department_id === emp?.Department_id);
        return {
          ...s,
          emp_no: emp?.emp_no ?? '—',
          full_name: emp ? `${emp.last_name}, ${emp.first_name}` : '—',
          dept_name: dept?.name ?? '—'
        };
      })
      .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
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
    if (this.newRecord.monthly_salary <= 0) { this.addError = 'Monthly salary must be greater than 0.'; return; }
    if (!this.newRecord.effective_date) { this.addError = 'Effective date is required.'; return; }

    const result = this.db.addSalary({
      Employee_id: Number(this.newRecord.Employee_id),
      monthly_salary: Number(this.newRecord.monthly_salary),
      effective_date: this.newRecord.effective_date
    });

    if (!result) {
      this.addError = 'A salary record for this employee on this date already exists.';
      return;
    }
    this.load();
    this.closeAdd();
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
  savePrivacy(): void { localStorage.setItem('payroll_privacy_prefs', JSON.stringify({ twoFactorEnabled: this.twoFactorEnabled, loginNotifications: this.loginNotifications, dataSharing: this.dataSharing })); alert('Saved!'); this.closePrivacy(); }
}
