// src/app/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../login-page/auth.service';
import { DatabaseService, Department } from '../database.service';

export type { Department };

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, FormsModule],
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
  showAddDeptModal = false;
  newDeptName = '';
  addDeptError = '';
  deptToDelete: Department | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private db: DatabaseService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser?.id) this.employeeNumber = this.generateEmpNumber(this.currentUser.id);
    this.loadDepartments();
  }

  private loadDepartments(): void {
    this.departments = this.db.getDepartments(true).map(d => ({
      ...d,
      headcount: this.db.getEmployeeCountForDepartment(d.Department_id)
    }));
  }

  getInitials(): string {
    if (!this.currentUser) return '?';
    return ((this.currentUser.firstName?.[0] ?? '') + (this.currentUser.lastName?.[0] ?? '')).toUpperCase();
  }

  private generateEmpNumber(id: string): string {
    return id.replace(/[^0-9a-z]/gi, '').slice(-5).toUpperCase().padStart(5, '0');
  }

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

  goToDepartment(dept: Department): void {
    this.router.navigate(['/department', dept.Department_id], { state: { department: dept } });
  }

  openAddDepartment(): void { this.newDeptName = ''; this.addDeptError = ''; this.showAddDeptModal = true; }
  closeAddDepartment(): void { this.showAddDeptModal = false; }
  addDepartment(): void {
    const name = this.newDeptName.trim();
    if (!name) { this.addDeptError = 'Department name is required.'; return; }
    const created = this.db.addDepartment(name);
    if (!created) { this.addDeptError = 'A department with this name already exists.'; return; }
    this.loadDepartments();
    this.closeAddDepartment();
  }

  confirmDeleteDept(dept: Department, e: MouseEvent): void { e.stopPropagation(); this.deptToDelete = dept; }
  cancelDeleteDept(): void { this.deptToDelete = null; }
  deleteDepartment(): void {
    if (!this.deptToDelete) return;
    this.db.deactivateDepartment(this.deptToDelete.Department_id);
    this.loadDepartments();
    this.deptToDelete = null;
  }
}
