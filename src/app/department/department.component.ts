// src/app/department/department.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../login-page/auth.service';
import { Department } from '../dashboard/dashboard.component';

export interface Employee {
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  status: 'Active' | 'Inactive' | 'On Leave';
  deptId: string;
}

@Component({
  selector: 'app-department',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './department.component.html',
  styleUrl: './department.component.css'
})
export class DepartmentComponent implements OnInit {
  currentUser: User | null = null;
  department: Department | null = null;
  employees: Employee[] = [];

  dropdownOpen = false;
  showPrivacyModal = false;
  twoFactorEnabled = false;
  loginNotifications = true;
  dataSharing = false;

  showAddEmpModal = false;
  addEmpError = '';
  newEmp = this.blankEmp();

  empToRemove: Employee | null = null;

  private readonly EMP_STORAGE_KEY = 'payroll_employees';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.currentUser = this.authService.getCurrentUser();

    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { department: Department } | undefined;

    if (state?.department) {
      this.department = state.department;
    } else {
      const deptId = this.route.snapshot.paramMap.get('deptId');
      const saved = localStorage.getItem('payroll_departments');
      if (saved && deptId) {
        const depts: Department[] = JSON.parse(saved);
        this.department = depts.find(d => d.deptId === deptId) ?? null;
      }
    }

    if (!this.department) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadEmployees();
  }

  // ── Helpers ───────────────────────────────────────────────
  getInitials(): string {
    if (!this.currentUser) return '?';
    return ((this.currentUser.firstName?.charAt(0) ?? '') +
            (this.currentUser.lastName?.charAt(0) ?? '')).toUpperCase();
  }

  getEmpInitials(emp: Employee): string {
    return ((emp.firstName?.charAt(0) ?? '') + (emp.lastName?.charAt(0) ?? '')).toUpperCase();
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  // ── Dropdown ──────────────────────────────────────────────
  toggleDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  openPrivacySettings(): void {
    this.dropdownOpen = false;
    this.showPrivacyModal = true;
  }

  closePrivacySettings(): void {
    this.showPrivacyModal = false;
  }

  savePrivacySettings(): void {
    localStorage.setItem('payroll_privacy_prefs', JSON.stringify({
      twoFactorEnabled: this.twoFactorEnabled,
      loginNotifications: this.loginNotifications,
      dataSharing: this.dataSharing
    }));
    alert('Privacy settings saved!');
    this.closePrivacySettings();
  }

  // ── Employees ─────────────────────────────────────────────
  private loadEmployees(): void {
    const saved = localStorage.getItem(this.EMP_STORAGE_KEY);
    const all: Employee[] = saved ? JSON.parse(saved) : [];
    this.employees = all.filter(e => e.deptId === this.department!.deptId);
    this.syncHeadcount();
  }

  /** Persist the full employees list (all depts) back to storage */
  private persistAllEmployees(all: Employee[]): void {
    localStorage.setItem(this.EMP_STORAGE_KEY, JSON.stringify(all));
  }

  /** Keep the department's headcount in sync with the live employees array */
  private syncHeadcount(): void {
    const saved = localStorage.getItem('payroll_departments');
    if (!saved || !this.department) return;
    const depts: Department[] = JSON.parse(saved);
    const idx = depts.findIndex(d => d.deptId === this.department!.deptId);
    if (idx > -1) {
      depts[idx].headcount = this.employees.length;
      localStorage.setItem('payroll_departments', JSON.stringify(depts));
      this.department.headcount = this.employees.length;
    }
  }

  private generateEmpNumber(): string {
    const saved = localStorage.getItem(this.EMP_STORAGE_KEY);
    const all: Employee[] = saved ? JSON.parse(saved) : [];
    return 'EMP-' + String(all.length + 1).padStart(5, '0');
  }

  private blankEmp() {
    return { firstName: '', lastName: '', email: '', position: '', status: 'Active' as const };
  }

  // Add
  openAddEmployee(): void {
    this.newEmp = this.blankEmp();
    this.addEmpError = '';
    this.showAddEmpModal = true;
  }

  closeAddEmployee(): void {
    this.showAddEmpModal = false;
  }

  addEmployee(): void {
    const { firstName, lastName, email, position } = this.newEmp;
    if (!firstName.trim() || !lastName.trim()) {
      this.addEmpError = 'First and last name are required.'; return;
    }
    if (!email.trim()) {
      this.addEmpError = 'Email is required.'; return;
    }
    if (!position.trim()) {
      this.addEmpError = 'Position is required.'; return;
    }

    const emp: Employee = {
      ...this.newEmp,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      position: position.trim(),
      employeeNumber: this.generateEmpNumber(),
      deptId: this.department!.deptId
    };

    // Add to local view
    this.employees = [...this.employees, emp];

    // Persist to full list
    const saved = localStorage.getItem(this.EMP_STORAGE_KEY);
    const all: Employee[] = saved ? JSON.parse(saved) : [];
    all.push(emp);
    this.persistAllEmployees(all);

    this.syncHeadcount();
    this.closeAddEmployee();
  }

  // Remove
  confirmRemove(emp: Employee): void {
    this.empToRemove = emp;
  }

  cancelRemove(): void {
    this.empToRemove = null;
  }

  removeEmployee(): void {
    if (!this.empToRemove) return;

    const target = this.empToRemove;

    // Remove from local view
    this.employees = this.employees.filter(
      e => e.employeeNumber !== target.employeeNumber
    );

    // Remove from full persisted list
    const saved = localStorage.getItem(this.EMP_STORAGE_KEY);
    const all: Employee[] = saved ? JSON.parse(saved) : [];
    const updated = all.filter(e => e.employeeNumber !== target.employeeNumber);
    this.persistAllEmployees(updated);

    this.syncHeadcount();
    this.empToRemove = null;
  }
}
