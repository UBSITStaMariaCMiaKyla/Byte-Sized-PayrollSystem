// src/app/login-page/auth.service.ts
import { Injectable } from '@angular/core';
import { delay, of } from 'rxjs';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyCode: string;
  role: 'admin' | 'employee' | 'hr';
  companyId: string;
  name?: string; // Computed property for convenience
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyCode: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'payroll_users';
  private readonly CURRENT_USER_KEY = 'payroll_current_user';

  constructor() { }

  // Get all users from localStorage
  private getUsers(): User[] {
    const users = localStorage.getItem(this.STORAGE_KEY);
    return users ? JSON.parse(users) : [];
  }

  // Save users to localStorage
  private saveUsers(users: User[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(users));
  }

  // Generate unique ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  login(email: string, password: string, companyCode?: string) {
    const users = this.getUsers();
    
    // Find user with matching credentials
    const user = users.find(
      (u) => u.email === email && u.password === password
    );

    if (user) {
      // Add computed name property
      user.name = `${user.firstName} ${user.lastName}`;
      
      // Save current user session
      localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
      
      const response: LoginResponse = {
        success: true,
        token: 'xyz_123_secure_token_' + this.generateId(),
        user: { ...user }
      };
      return of(response).pipe(delay(800));
    } else {
      const response: LoginResponse = {
        success: false,
        message: 'Invalid email or password.'
      };
      return of(response).pipe(delay(800));
    }
  }

  register(data: RegisterRequest) {
    const users = this.getUsers();
    
    // Check if email already exists
    const existingUser = users.find((u) => u.email === data.email);
    
    if (existingUser) {
      const response: LoginResponse = {
        success: false,
        message: 'An account with this email already exists.'
      };
      return of(response).pipe(delay(800));
    }

    // Create new user
    const newUser: User = {
      id: this.generateId(),
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      companyCode: data.companyCode,
      role: 'employee',
      companyId: data.companyCode,
      name: `${data.firstName} ${data.lastName}`
    };

    // Save to localStorage
    users.push(newUser);
    this.saveUsers(users);

    const response: LoginResponse = {
      success: true,
      token: 'xyz_123_new_user_token_' + this.generateId(),
      user: { ...newUser }
    };
    return of(response).pipe(delay(1500));
  }

  // Logout - clear current user
  logout(): void {
    localStorage.removeItem(this.CURRENT_USER_KEY);
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    const currentUser = localStorage.getItem(this.CURRENT_USER_KEY);
    return !!currentUser;
  }

  // Get current user
  getCurrentUser(): User | null {
    const user = localStorage.getItem(this.CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  }
}