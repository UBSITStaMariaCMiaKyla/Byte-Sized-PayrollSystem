// src/app/department/department.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
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

  empToDeactivate: Employee | null = null;

  // ── Deactivate Department ────────────────────────────────
  showDeactivateDeptModal = false;

  showEditEmpModal = false;
  editEmpError = '';
  editEmp: {
    Employee_id: number;
    first_name: string; last_name: string; middle_name: string;
    email: string; gender: Employee['gender'];
  } = this.blankEditEmp();

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService,
    private location: Location
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

  get activeEmployees(): Employee[] {
    return this.employees.filter(e => e.active === 1);
  }

  get inactiveEmployees(): Employee[] {
    return this.employees.filter(e => e.active === 0);
  }

  getInitials(): string {
    if (!this.currentUser) return '?';
    return ((this.currentUser.firstName?.[0] ?? '') + (this.currentUser.lastName?.[0] ?? '')).toUpperCase();
  }

  getEmpInitials(emp: Employee): string {
    return ((emp.first_name?.[0] ?? '') + (emp.last_name?.[0] ?? '')).toUpperCase();
  }

  goBack(): void { this.location.back(); }

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

  // ── Deactivate Department ────────────────────────────────
  confirmDeactivateDept(): void { this.showDeactivateDeptModal = true; }
  cancelDeactivateDept(): void { this.showDeactivateDeptModal = false; }

  deactivateDepartment(): void {
    if (!this.department) return;
    this.api.deactivateDepartment(this.department.Department_id).subscribe({
      next: () => {
        this.showDeactivateDeptModal = false;
        this.router.navigate(['/dashboard']);
      },
      error: () => { alert('Failed to deactivate department.'); }
    });
  }

  private blankEmp() {
    return {
      first_name: '', last_name: '', middle_name: '',
      email: '', gender: 'Prefer not to say' as Employee['gender']
    };
  }

  private blankEditEmp() {
    return {
      Employee_id: 0, first_name: '', last_name: '', middle_name: '',
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
      first_name: first_name.trim(), last_name: last_name.trim(),
      middle_name: this.newEmp.middle_name?.trim() || undefined,
      email: email.trim(), gender: gender ?? undefined
    }).subscribe({
      next: (res) => {
        if (!res.success) { this.addEmpError = res.message; return; }
        this.loadEmployees(); this.closeAddEmployee();
      },
      error: () => { this.addEmpError = 'Failed to add employee. Please try again.'; }
    });
  }

  openEditEmployee(emp: Employee): void {
    this.editEmp = {
      Employee_id: emp.Employee_id,
      first_name: emp.first_name, last_name: emp.last_name,
      middle_name: emp.middle_name ?? '', email: emp.email ?? '',
      gender: emp.gender ?? 'Prefer not to say'
    };
    this.editEmpError = '';
    this.showEditEmpModal = true;
  }

  closeEditEmployee(): void { this.showEditEmpModal = false; }

  saveEditEmployee(): void {
    const { first_name, last_name, email, gender } = this.editEmp;
    if (!first_name.trim() || !last_name.trim()) { this.editEmpError = 'First and last name are required.'; return; }
    if (!email.trim()) { this.editEmpError = 'Email is required.'; return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { this.editEmpError = 'Enter a valid email address.'; return; }

    this.api.updateEmployee(this.editEmp.Employee_id, {
      first_name: first_name.trim(), last_name: last_name.trim(),
      middle_name: this.editEmp.middle_name?.trim() || undefined,
      email: email.trim(), gender: gender ?? undefined
    }).subscribe({
      next: (res) => {
        if (!res.success) { this.editEmpError = res.message; return; }
        this.loadEmployees(); this.closeEditEmployee();
      },
      error: () => { this.editEmpError = 'Failed to update employee. Please try again.'; }
    });
  }

  confirmDeactivate(emp: Employee): void { this.empToDeactivate = emp; }
  cancelDeactivate(): void { this.empToDeactivate = null; }

  deactivateEmployee(): void {
    if (!this.empToDeactivate) return;
    this.api.deactivateEmployee(this.empToDeactivate.Employee_id).subscribe({
      next: () => { this.loadEmployees(); this.empToDeactivate = null; },
      error: () => { alert('Failed to deactivate employee.'); this.empToDeactivate = null; }
    });
  }

  activateEmployee(emp: Employee): void {
    this.api.activateEmployee(emp.Employee_id).subscribe({
      next: () => { this.loadEmployees(); },
      error: () => { alert('Failed to activate employee.'); }
    });
  }
}