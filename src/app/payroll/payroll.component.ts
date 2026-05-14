// src/app/payroll/payroll.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../login-page/auth.service';
import { ApiService } from '../api.service';

export interface Payroll {
  Payroll_id: number;
  period_start: string;
  period_end: string;
  payroll_date: string;
}

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  constructor(
    private authService: AuthService,
    private router: Router,
    private api: ApiService,
    private location: Location
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.currentUser = this.authService.getCurrentUser();
    this.load();
  }

  private load(): void {
    this.api.getPayrolls().subscribe({
      next: (payrolls) => {
        this.payrolls = payrolls;
        this.payslipCounts = {};
        payrolls.forEach(p => {
          this.api.getPayslipsByPayroll(p.Payroll_id).subscribe({
            next: (slips) => { this.payslipCounts[p.Payroll_id] = slips.length; }
          });
        });
      },
      error: (err) => { console.error('Failed to load payrolls', err); }
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

    this.api.addPayroll({ period_start, period_end, payroll_date }).subscribe({
      next: (res) => {
        if (!res.success) { this.addError = res.message; return; }
        this.load();
        this.closeAdd();
      },
      error: () => { this.addError = 'Failed to create payroll. Please try again.'; }
    });
  }

  goBack(): void { this.location.back(); }

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