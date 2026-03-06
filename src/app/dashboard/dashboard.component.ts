// src/app/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../login-page/auth.service';

export interface Department {
  name: string;
  deptId: string;
  headcount: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  employeeNumber: string = '';

  dropdownOpen = false;

  showPrivacyModal = false;
  twoFactorEnabled = false;
  loginNotifications = true;
  dataSharing = false;

  departments: Department[] = [
    { name: 'Accounting',      deptId: 'DEPT-ACC-001', headcount: 0 },
    { name: 'IT',              deptId: 'DEPT-IT-001',  headcount: 0 },
    { name: 'Human Resources', deptId: 'DEPT-HR-001',  headcount: 0 },
  ];

  showAddDeptModal = false;
  newDeptName = '';
  addDeptError = '';
  deptToDelete: Department | null = null;

  private readonly DEPT_STORAGE_KEY = 'payroll_departments';

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser?.id) {
      this.employeeNumber = this.generateEmployeeNumber(this.currentUser.id);
    }
    this.loadDepartments();
  }

  getInitials(): string {
    if (!this.currentUser) return '?';
    return ((this.currentUser.firstName?.charAt(0) ?? '') +
            (this.currentUser.lastName?.charAt(0) ?? '')).toUpperCase();
  }

  private generateEmployeeNumber(id: string): string {
    return id.replace(/[^0-9a-z]/gi, '').slice(-5).toUpperCase().padStart(5, '0');
  }

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

  goToDepartment(dept: Department): void {
    this.router.navigate(['/department', dept.deptId], {
      state: { department: dept }
    });
  }

  private loadDepartments(): void {
    const saved = localStorage.getItem(this.DEPT_STORAGE_KEY);
    if (saved) {
      this.departments = JSON.parse(saved);
    } else {
      this.saveDepartments();
    }
  }

  private saveDepartments(): void {
    localStorage.setItem(this.DEPT_STORAGE_KEY, JSON.stringify(this.departments));
  }

  openAddDepartment(): void {
    this.newDeptName = '';
    this.addDeptError = '';
    this.showAddDeptModal = true;
  }

  closeAddDepartment(): void {
    this.showAddDeptModal = false;
  }

  addDepartment(): void {
    const name = this.newDeptName.trim();

    if (!name) {
      this.addDeptError = 'Department name is required.';
      return;
    }

    // Block duplicate names (case-insensitive)
    if (this.departments.some(d => d.name.toLowerCase() === name.toLowerCase())) {
      this.addDeptError = 'A department with this name already exists.';
      return;
    }

    const deptId = this.generateUniqueDeptId(name);

    const newDept: Department = { name, deptId, headcount: 0 };
    this.departments = [...this.departments, newDept];
    this.saveDepartments();
    this.closeAddDepartment();
  }

  confirmDeleteDept(dept: Department, event: MouseEvent): void {
    event.stopPropagation(); // prevent navigating into the department
    this.deptToDelete = dept;
  }

  cancelDeleteDept(): void {
    this.deptToDelete = null;
  }

  deleteDepartment(): void {
    if (!this.deptToDelete) return;
    const targetId = this.deptToDelete.deptId;

    // Remove department from list
    this.departments = this.departments.filter(d => d.deptId !== targetId);
    this.saveDepartments();

    // Also remove all employees that belonged to this department
    const empKey = 'payroll_employees';
    const saved = localStorage.getItem(empKey);
    if (saved) {
      const all = JSON.parse(saved).filter((e: any) => e.deptId !== targetId);
      localStorage.setItem(empKey, JSON.stringify(all));
    }

    this.deptToDelete = null;
  }

  /**
   * Builds a dept ID from the name slug and appends an incrementing
   * numeric suffix until the ID is not already taken.
   *
   * Example: "Marketing" → DEPT-MARKET-001
   * If DEPT-MARKET-001 already exists → DEPT-MARKET-002, etc.
   */
  private generateUniqueDeptId(name: string): string {
    const existingIds = new Set(this.departments.map(d => d.deptId));

    // Build a 6-char slug from the name (letters/digits only, uppercased)
    const slug = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')       // collapse consecutive dashes
      .replace(/^-|-$/g, '')     // trim leading/trailing dashes
      .slice(0, 6);

    let counter = 1;
    let candidate: string;

    do {
      candidate = `DEPT-${slug}-${String(counter).padStart(3, '0')}`;
      counter++;
    } while (existingIds.has(candidate));

    return candidate;
  }
}
