// src/app/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../login-page/auth.service';
import { ApiService } from '../api.service';

export interface Department {
  Department_id: number;
  name: string;
  active: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  employeeNumber = '';
  dropdownOpen = false;
  showPrivacyModal = false;
  twoFactorEnabled = false;
  loginNotifications = true;
  dataSharing = false;

  departments: (Department & { headcount: number })[] = [];
  totalDepartments = 0;
  showAddDeptModal = false;
  newDeptName = '';
  addDeptError = '';
  deptToDeactivate: Department | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private api: ApiService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser?.id) {
      this.employeeNumber = this.generateEmpNumber(this.currentUser.id);
    }
    this.loadDepartments();
  }

  private loadDepartments(): void {
    this.api.getDepartments(true).subscribe({
      next: (depts) => {
        this.totalDepartments = depts.length;
        this.departments = depts.map(d => ({ ...d, headcount: 0 }));
        this.departments.forEach((d, i) => {
          this.api.getDeptHeadcount(d.Department_id).subscribe({
            next: ({ headcount }) => {
              this.departments[i] = { ...this.departments[i], headcount };
            }
          });
        });
      },
      error: (err) => { console.error('Failed to load departments', err); }
    });
  }

  getInitials(): string {
    if (!this.currentUser) return '?';
    return ((this.currentUser.firstName?.[0] ?? '') + (this.currentUser.lastName?.[0] ?? '')).toUpperCase();
  }

  private generateEmpNumber(id: number): string {
    return String(id).padStart(5, '0');
  }

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

  goToDepartment(dept: Department): void {
    this.router.navigate(['/department', dept.Department_id], { state: { department: dept } });
  }

  openAddDepartment(): void { this.newDeptName = ''; this.addDeptError = ''; this.showAddDeptModal = true; }
  closeAddDepartment(): void { this.showAddDeptModal = false; }

  addDepartment(): void {
    const name = this.newDeptName.trim();
    if (!name) { this.addDeptError = 'Department name is required.'; return; }
    this.api.addDepartment(name).subscribe({
      next: (res) => {
        if (!res.success) { this.addDeptError = res.message; return; }
        this.loadDepartments();
        this.closeAddDepartment();
      },
      error: () => { this.addDeptError = 'Failed to add department. Please try again.'; }
    });
  }

  confirmDeactivateDept(dept: Department, e: MouseEvent): void { e.stopPropagation(); this.deptToDeactivate = dept; }
  cancelDeactivateDept(): void { this.deptToDeactivate = null; }

  deactivateDepartment(): void {
    if (!this.deptToDeactivate) return;
    this.api.deactivateDepartment(this.deptToDeactivate.Department_id).subscribe({
      next: () => { this.loadDepartments(); this.deptToDeactivate = null; },
      error: () => { alert('Failed to deactivate department.'); this.deptToDeactivate = null; }
    });
  }
}