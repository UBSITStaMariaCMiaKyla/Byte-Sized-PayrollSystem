// src/app/payslip/payslip.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../login-page/auth.service';
import { ApiService } from '../api.service';

export interface Payslip {
  Payslip_id: number; Payroll_id: number; Employee_id: number;
  gross_pay: number; total_deductions: number; net_pay: number;
}

interface PayslipRow extends Payslip {
  emp_no: string;
  full_name: string;
  period_start: string;
  period_end: string;
  payroll_date: string;
}

@Component({
  selector: 'app-payslip',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './payslip.component.html',
  styleUrl: './payslip.component.css'
})
export class PayslipComponent implements OnInit {
  currentUser: User | null = null;
  dropdownOpen = false;
  showPrivacyModal = false;
  twoFactorEnabled = false;
  loginNotifications = true;
  dataSharing = false;

  rows: PayslipRow[] = [];
  employees: any[] = [];
  payrolls: any[] = [];

  showAddModal = false;
  addError = '';
  newRecord = this.blank();

  slipToDelete: Payslip | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.currentUser = this.authService.getCurrentUser();
    this.api.getEmployees().subscribe({ next: (emps) => { this.employees = emps; } });
    this.api.getPayrolls().subscribe({ next: (pays) => { this.payrolls = pays; } });
    this.load();
  }

  private load(): void {
    Promise.all([
      this.api.getPayslips().toPromise(),
      this.api.getEmployees().toPromise(),
      this.api.getPayrolls().toPromise()
    ]).then(([slips, emps, pays]) => {
      this.rows = (slips ?? []).map((s: any) => {
        const emp = (emps ?? []).find((e: any) => e.Employee_id === s.Employee_id);
        const payroll = (pays ?? []).find((p: any) => p.Payroll_id === s.Payroll_id);
        return {
          ...s,
          emp_no: emp?.emp_no ?? '—',
          full_name: emp ? `${emp.last_name}, ${emp.first_name}` : '—',
          period_start: payroll?.period_start ?? '—',
          period_end: payroll?.period_end ?? '—',
          payroll_date: payroll?.payroll_date ?? '—',
        };
      }).sort((a: any, b: any) => b.Payslip_id - a.Payslip_id);
    });
  }

  private blank() {
    return { Payroll_id: 0, Employee_id: 0, gross_pay: 0, total_deductions: 0 };
  }

  get previewNetPay(): number {
    return Math.max(0, Number(this.newRecord.gross_pay) - Number(this.newRecord.total_deductions));
  }

  openAdd(): void { this.newRecord = this.blank(); this.addError = ''; this.showAddModal = true; }
  closeAdd(): void { this.showAddModal = false; }

  save(): void {
    const { Payroll_id, Employee_id, gross_pay, total_deductions } = this.newRecord;
    if (!Payroll_id) { this.addError = 'Select a payroll period.'; return; }
    if (!Employee_id) { this.addError = 'Select an employee.'; return; }
    if (Number(gross_pay) < 0) { this.addError = 'Gross pay cannot be negative.'; return; }
    if (Number(total_deductions) < 0) { this.addError = 'Total deductions cannot be negative.'; return; }

    this.api.addPayslip({
      Payroll_id: Number(Payroll_id),
      Employee_id: Number(Employee_id),
      gross_pay: Number(gross_pay),
      total_deductions: Number(total_deductions)
    }).subscribe({
      next: (res) => {
        if (!res.success) { this.addError = res.message; return; }
        this.load();
        this.closeAdd();
      },
      error: () => { this.addError = 'Failed to add payslip. Please try again.'; }
    });
  }

  confirmDelete(s: Payslip): void { this.slipToDelete = s; }
  cancelDelete(): void { this.slipToDelete = null; }

  deleteSlip(): void {
    if (!this.slipToDelete) return;
    this.api.deletePayslip(this.slipToDelete.Payslip_id).subscribe({
      next: () => { this.load(); this.slipToDelete = null; },
      error: () => { alert('Failed to delete payslip.'); this.slipToDelete = null; }
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