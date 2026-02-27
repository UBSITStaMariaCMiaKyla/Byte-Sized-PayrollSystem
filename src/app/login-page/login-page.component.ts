// src/app/login-page/login-page.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService, LoginResponse } from './auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.css'
})
export class LoginPageComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      companyCode: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { email, password, companyCode } = this.loginForm.value;

    this.authService.login(email, password, companyCode).subscribe({
      next: (response: LoginResponse) => {
        this.isLoading = false;
        if (response.success) {
          console.log('Login Success:', response.user);
          alert(`Welcome, ${response.user?.name}!`);
        } else {
          this.errorMessage = response.message || 'Login failed';
        }
      },
      error: (err: Error) => {  // Explicitly typed as Error
        this.isLoading = false;
        this.errorMessage = 'An unexpected error occurred.';
      }
    });
  }
}