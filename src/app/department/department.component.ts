// src/app/department/department.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../login-page/auth.service';
import { ApiService } from '../api.service';

export interface Department { Department_id: number; name: string; active: number; }
export interface Employee {
  Employee_id: number; Department_id: number; emp_no: string | null;
  first_name: string; last_name: string; middle_name: string | null;
  gender: 'Male' | 'Female' | 'Prefer not to say' | null;
  email: string | null; active: number;
}

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

  showAddEmpModal = false;
  addEmpError = '';
  newEmp = this.blankEmp();

  empToRemove: Employee | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.currentUser = this.authService.getCurrentUser();

    const nav = this.router.getCurrentNavigation();
    const state = nav?.extras?.state as { department: Department } | undefined;

    if (state?.department) {
      this.department = state.department;
      this.loadEmployees();
    } else {
      const id = Number(this.route.snapshot.paramMap.get('deptId'));
      this.api.getDepartment(id).subscribe({
        next: (dept) => { this.department = dept; this.loadEmployees(); },
        error: () => { this.router.navigate(['/dashboard']); }
      });
    }
  }

  private loadEmployees(): void {
    if (!this.department) return;
    this.api.getEmployeesByDept(this.department.Department_id).subscribe({
      next: (emps) => { this.employees = emps; },
      error: (err) => { console.error('Failed to load employees', err); }
    });
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
    localStorage.setItem('payroll_privacy_prefs', JSON.stringify({
      twoFactorEnabled: this.twoFactorEnabled,
      loginNotifications: this.loginNotifications,
      dataSharing: this.dataSharing
    }));
    alert('Privacy settings saved!');
    this.closePrivacySettings();
  }

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

    this.api.addEmployee({
      Department_id: this.department!.Department_id,
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      middle_name: this.newEmp.middle_name?.trim() || undefined,
      email: email.trim(),
      gender: gender ?? undefined
    }).subscribe({
      next: (res) => {
        if (!res.success) { this.addEmpError = res.message; return; }
        this.loadEmployees();
        this.closeAddEmployee();
      },
      error: () => { this.addEmpError = 'Failed to add employee. Please try again.'; }
    });
  }

  confirmRemove(emp: Employee): void { this.empToRemove = emp; }
  cancelRemove(): void { this.empToRemove = null; }

  removeEmployee(): void {
    if (!this.empToRemove) return;
    this.api.deleteEmployee(this.empToRemove.Employee_id).subscribe({
      next: () => { this.loadEmployees(); this.empToRemove = null; },
      error: () => { alert('Failed to remove employee.'); this.empToRemove = null; }
    });
  }
}