// src/app/login-page/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  companyCode: string;
  role: 'admin' | 'employee' | 'hr';
  name?: string;
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

const BASE_URL = 'http://localhost:3000/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'payroll_token';
  private readonly CURRENT_USER_KEY = 'payroll_current_user';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${BASE_URL}/auth/login`, { email, password }).pipe(
      tap(res => {
        if (res.success && res.token && res.user) {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          res.user.name = `${res.user.firstName} ${res.user.lastName}`;
          localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(res.user));
        }
      })
    );
  }

  register(data: RegisterRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${BASE_URL}/auth/register`, data).pipe(
      tap(res => {
        if (res.success && res.token && res.user) {
          localStorage.setItem(this.TOKEN_KEY, res.token);
          res.user.name = `${res.user.firstName} ${res.user.lastName}`;
          localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(res.user));
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.CURRENT_USER_KEY);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem(this.TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    const user = localStorage.getItem(this.CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
  }
}