// src/app/payroll/payroll.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../login-page/auth.service';
import { DatabaseService, Payroll } from '../database.service';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './payroll.component.html',
  styleUrl: './payroll.component.css'
})
export class PayrollComponent implements OnInit {
  currentUser: User | null = null;
  dropdownOpen = false;
  showPrivacyModal = false;
  twoFactorEnabled = false;
  loginNotifications = true;
  dataSharing = false;

  payrolls: Payroll[] = [];
  payslipCounts: Record<number, number> = {};

  showAddModal = false;
  addError = '';
  newRecord = this.blank();

  payrollToDelete: Payroll | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private db: DatabaseService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.currentUser = this.authService.getCurrentUser();
    this.load();
  }

  private load(): void {
    this.payrolls = this.db.getPayrolls();
    this.payslipCounts = {};
    this.payrolls.forEach(p => {
      this.payslipCounts[p.Payroll_id] = this.db.getPayslipsByPayroll(p.Payroll_id).length;
    });
  }

  private blank() {
    const today = new Date().toISOString().slice(0, 10);
    return { period_start: '', period_end: '', payroll_date: today };
  }

  openAdd(): void { this.newRecord = this.blank(); this.addError = ''; this.showAddModal = true; }
  closeAdd(): void { this.showAddModal = false; }

  save(): void {
    const { period_start, period_end, payroll_date } = this.newRecord;
    if (!period_start || !period_end || !payroll_date) { this.addError = 'All fields are required.'; return; }
    if (period_end < period_start) { this.addError = 'Period end must be on or after period start.'; return; }

    const result = this.db.addPayroll({ period_start, period_end, payroll_date });
    if (!result) { this.addError = 'Invalid period dates.'; return; }
    this.load();
    this.closeAdd();
  }

  confirmDelete(p: Payroll): void { this.payrollToDelete = p; }
  cancelDelete(): void { this.payrollToDelete = null; }
  deletePayroll(): void {
    if (!this.payrollToDelete) return;
    this.db.deletePayroll(this.payrollToDelete.Payroll_id);
    this.load();
    this.payrollToDelete = null;
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
