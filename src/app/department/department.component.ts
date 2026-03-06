// src/app/department/department.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../login-page/auth.service';
import { DatabaseService, Department, Employee } from '../database.service';

@Component({
  selector: 'app-department',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
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

  // Add employee modal — only fields that exist in the DB
  showAddEmpModal = false;
  addEmpError = '';
  newEmp = this.blankEmp();

  // Remove confirm
  empToRemove: Employee | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private db: DatabaseService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.currentUser = this.authService.getCurrentUser();

    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { department: Department } | undefined;

    if (state?.department) {
      this.department = state.department;
    } else {
      const id = Number(this.route.snapshot.paramMap.get('deptId'));
      this.department = this.db.getDepartmentById(id) ?? null;
    }

    if (!this.department) { this.router.navigate(['/dashboard']); return; }
    this.loadEmployees();
  }

  private loadEmployees(): void {
    this.employees = this.db.getEmployeesByDept(this.department!.Department_id);
  }

  getInitials(): string {
    if (!this.currentUser) return '?';
    return ((this.currentUser.firstName?.[0] ?? '') + (this.currentUser.lastName?.[0] ?? '')).toUpperCase();
  }

  getEmpInitials(emp: Employee): string {
    return ((emp.first_name?.[0] ?? '') + (emp.last_name?.[0] ?? '')).toUpperCase();
  }

  goBack(): void { this.router.navigate(['/dashboard']); }

  toggleDropdown(e: MouseEvent): void { e.stopPropagation(); this.dropdownOpen = !this.dropdownOpen; }
  closeDropdown(): void { this.dropdownOpen = false; }
  logout(): void { this.authService.logout(); this.router.navigate(['/login']); }
  openPrivacySettings(): void { this.dropdownOpen = false; this.showPrivacyModal = true; }
  closePrivacySettings(): void { this.showPrivacyModal = false; }
  savePrivacySettings(): void {
    localStorage.setItem('payroll_privacy_prefs', JSON.stringify({ twoFactorEnabled: this.twoFactorEnabled, loginNotifications: this.loginNotifications, dataSharing: this.dataSharing }));
    alert('Privacy settings saved!');
    this.closePrivacySettings();
  }

  // ── Add Employee ──────────────────────────────────────────
  private blankEmp() {
    return {
      first_name: '', last_name: '', middle_name: '',
      email: '', gender: 'Prefer not to say' as Employee['gender']
    };
  }

  openAddEmployee(): void { this.newEmp = this.blankEmp(); this.addEmpError = ''; this.showAddEmpModal = true; }
  closeAddEmployee(): void { this.showAddEmpModal = false; }

  addEmployee(): void {
    const { first_name, last_name, email, gender } = this.newEmp;
    if (!first_name.trim() || !last_name.trim()) { this.addEmpError = 'First and last name are required.'; return; }
    if (!email.trim()) { this.addEmpError = 'Email is required.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { this.addEmpError = 'Enter a valid email address.'; return; }

    const created = this.db.addEmployee({
      Department_id: this.department!.Department_id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      middle_name: this.newEmp.middle_name?.trim() || null,
      email: email.trim(),
      gender
    });

    if (!created) { this.addEmpError = 'An employee with this email already exists.'; return; }
    this.loadEmployees();
    this.closeAddEmployee();
  }

  // ── Remove Employee ───────────────────────────────────────
  confirmRemove(emp: Employee): void { this.empToRemove = emp; }
  cancelRemove(): void { this.empToRemove = null; }
  removeEmployee(): void {
    if (!this.empToRemove) return;
    this.db.removeEmployee(this.empToRemove.Employee_id);
    this.loadEmployees();
    this.empToRemove = null;
  }
}
