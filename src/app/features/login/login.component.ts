import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html'
})
export class LoginComponent {

    form = this.fb.group({
        username: ['', Validators.required],
        password: ['', Validators.required]
    });

    loading = false;
    error = false;

    constructor(
        private fb: FormBuilder,
        private auth: AuthService,
        private router: Router,
        private route: ActivatedRoute
    ) { }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading = true;
        this.error = false;
        const { username, password } = this.form.getRawValue();

        this.auth.login(username!.trim(), password!.trim()).subscribe({
            next: () => {
                const redirect = this.route.snapshot.queryParamMap.get('redirect') || '/';
                this.router.navigateByUrl(redirect);
            },
            error: () => {
                this.loading = false;
                this.error = true;
            }
        });
    }
}
