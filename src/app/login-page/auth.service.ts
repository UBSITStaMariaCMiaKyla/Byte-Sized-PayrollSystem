// src/app/login-page/auth.service.ts
import { Injectable } from '@angular/core';
import { delay, of } from 'rxjs';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'employee' | 'hr';
  companyId: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor() { }

  login(email: string, password: string, companyCode?: string) {
    // Simulate API Call
    if (email === 'admin@payroll.com' && password === 'secure123') {
      const response: LoginResponse = {
        success: true,
        token: 'xyz_123_secure_token',
        user: { id: '1', name: 'John Doe', role: 'admin', companyId: 'ABC Corp' }
      };
      return of(response).pipe(delay(1500));
    } else {
      const response: LoginResponse = {
        success: false,
        message: 'Invalid credentials or Company ID.'
      };
      return of(response).pipe(delay(1500));
    }
  }
}