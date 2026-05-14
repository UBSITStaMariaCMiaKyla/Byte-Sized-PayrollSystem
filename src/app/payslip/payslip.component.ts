// src/app/payslip/payslip.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../login-page/auth.service';
import { ApiService } from '../api.service';

export interface Payslip {
  Payslip_id: number; Payroll_id: number; Employee_id: number;
  gross_pay: number; total_deductions: number; net_pay: number;
  hours_worked: number | null; overtime_hours: number | null;
  overtime_pay: number | null; tax_deduction: number | null;
  sss_deduction: number | null; philhealth_deduction: number | null;
  pagibig_deduction: number | null;
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
  imports: [CommonModule, FormsModule],
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
  salaryWarning = '';
  newRecord = this.blank();

  private currentHourlyRate = 0;

  slipToDelete: Payslip | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private api: ApiService,
    private location: Location
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
    return {
      Payroll_id: 0, Employee_id: 0, gross_pay: 0,
      hours_worked: 0, overtime_hours: 0, overtime_pay: 0,
      sss_deduction: 0, philhealth_deduction: 0,
      pagibig_deduction: 0, tax_deduction: 0, total_deductions: 0
    };
  }

  private computeSSS(monthlizedSalary: number): number {
    if (monthlizedSalary < 4250) return 180;
    if (monthlizedSalary < 4750) return 202.50;
    if (monthlizedSalary < 5250) return 225;
    if (monthlizedSalary < 5750) return 247.50;
    if (monthlizedSalary < 6250) return 270;
    if (monthlizedSalary < 6750) return 292.50;
    if (monthlizedSalary < 7250) return 315;
    if (monthlizedSalary < 7750) return 337.50;
    if (monthlizedSalary < 8250) return 360;
    if (monthlizedSalary < 8750) return 382.50;
    if (monthlizedSalary < 9250) return 405;
    if (monthlizedSalary < 9750) return 427.50;
    if (monthlizedSalary < 10250) return 450;
    if (monthlizedSalary < 10750) return 472.50;
    if (monthlizedSalary < 11250) return 495;
    if (monthlizedSalary < 11750) return 517.50;
    if (monthlizedSalary < 12250) return 540;
    if (monthlizedSalary < 12750) return 562.50;
    if (monthlizedSalary < 13250) return 585;
    if (monthlizedSalary < 13750) return 607.50;
    if (monthlizedSalary < 14250) return 630;
    if (monthlizedSalary < 14750) return 652.50;
    if (monthlizedSalary < 15250) return 675;
    if (monthlizedSalary < 15750) return 697.50;
    if (monthlizedSalary < 16250) return 720;
    if (monthlizedSalary < 16750) return 742.50;
    if (monthlizedSalary < 17250) return 765;
    if (monthlizedSalary < 17750) return 787.50;
    if (monthlizedSalary < 18250) return 810;
    if (monthlizedSalary < 18750) return 832.50;
    if (monthlizedSalary < 19250) return 855;
    if (monthlizedSalary < 19750) return 877.50;
    if (monthlizedSalary < 20250) return 900;
    return 900;
  }

  private computePhilHealth(monthlizedSalary: number): number {
    const contribution = monthlizedSalary * 0.025;
    return Math.min(Math.max(contribution, 250), 2500);
  }

  private computePagIbig(monthlizedSalary: number): number {
    return monthlizedSalary <= 1500 ? Math.round(monthlizedSalary * 0.01) : 100;
  }

  private computeGrossPay(hours: number): number {
    return parseFloat((this.currentHourlyRate * hours).toFixed(2));
  }

  private computeOvertimePay(overtimeHours: number): number {
    if (!this.currentHourlyRate || !overtimeHours) return 0;
    return parseFloat((this.currentHourlyRate * 1.25 * overtimeHours).toFixed(2));
  }

  private getMonthlizedSalary(): number {
    return this.currentHourlyRate * 8 * 22;
  }

  onEmployeeChange(): void {
    this.salaryWarning = '';
    this.currentHourlyRate = 0;
    this.newRecord.gross_pay = 0;
    this.newRecord.hours_worked = 0;
    this.newRecord.overtime_hours = 0;
    this.newRecord.overtime_pay = 0;
    this.newRecord.sss_deduction = 0;
    this.newRecord.philhealth_deduction = 0;
    this.newRecord.pagibig_deduction = 0;
    this.newRecord.tax_deduction = 0;

    const empId = Number(this.newRecord.Employee_id);
    if (!empId) return;

    this.api.getCurrentSalary(empId).subscribe({
      next: (sal) => {
        this.currentHourlyRate = Number(sal.monthly_salary);
        const monthlized = this.getMonthlizedSalary();
        this.newRecord.sss_deduction = this.computeSSS(monthlized);
        this.newRecord.philhealth_deduction = parseFloat(this.computePhilHealth(monthlized).toFixed(2));
        this.newRecord.pagibig_deduction = this.computePagIbig(monthlized);
        this.newRecord.tax_deduction = 0;
      },
      error: () => {
        this.currentHourlyRate = 0;
        this.salaryWarning = 'No salary record found for this employee. Please add one in Salary Records first.';
      }
    });
  }

  onHoursChange(): void {
    const hours = Number(this.newRecord.hours_worked) || 0;
    this.newRecord.gross_pay = this.computeGrossPay(hours);
    const otHours = Number(this.newRecord.overtime_hours) || 0;
    this.newRecord.overtime_pay = this.computeOvertimePay(otHours);
  }

  onOvertimeChange(): void {
    const otHours = Number(this.newRecord.overtime_hours) || 0;
    this.newRecord.overtime_pay = this.computeOvertimePay(otHours);
  }

  get previewTotalDeductions(): number {
    return (Number(this.newRecord.sss_deduction) || 0)
         + (Number(this.newRecord.philhealth_deduction) || 0)
         + (Number(this.newRecord.pagibig_deduction) || 0)
         + (Number(this.newRecord.tax_deduction) || 0);
  }

  get previewNetPay(): number {
    const grossWithOT = Number(this.newRecord.gross_pay) + (Number(this.newRecord.overtime_pay) || 0);
    return Math.max(0, grossWithOT - this.previewTotalDeductions);
  }

  openAdd(): void {
    this.newRecord = this.blank();
    this.addError = '';
    this.salaryWarning = '';
    this.currentHourlyRate = 0;
    this.showAddModal = true;
  }
  closeAdd(): void { this.showAddModal = false; }

  save(): void {
    const { Payroll_id, Employee_id, hours_worked } = this.newRecord;
    if (!Payroll_id) { this.addError = 'Select a payroll period.'; return; }
    if (!Employee_id) { this.addError = 'Select an employee.'; return; }
    if (!this.currentHourlyRate) { this.addError = 'No salary record found for this employee.'; return; }
    if (!Number(hours_worked)) { this.addError = 'Hours worked is required.'; return; }

    const gross_pay = Number(this.newRecord.gross_pay);
    const overtime_pay = Number(this.newRecord.overtime_pay) || 0;
    const total_deductions = this.previewTotalDeductions;
    const finalGross = parseFloat((gross_pay + overtime_pay).toFixed(2));

    this.api.addPayslip({
      Payroll_id: Number(Payroll_id),
      Employee_id: Number(Employee_id),
      gross_pay: finalGross,
      total_deductions,
      hours_worked: Number(this.newRecord.hours_worked) || null,
      overtime_hours: Number(this.newRecord.overtime_hours) || null,
      overtime_pay: overtime_pay || null,
      sss_deduction: Number(this.newRecord.sss_deduction) || null,
      philhealth_deduction: Number(this.newRecord.philhealth_deduction) || null,
      pagibig_deduction: Number(this.newRecord.pagibig_deduction) || null,
      tax_deduction: Number(this.newRecord.tax_deduction) || null,
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