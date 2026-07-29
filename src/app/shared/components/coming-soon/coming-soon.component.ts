import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-coming-soon',
    template: `
        <div class="card flex flex-column align-items-center justify-content-center text-center" style="min-height: 60vh;">
            <i class="pi pi-hammer" style="font-size: 2.5rem" class="text-500"></i>
            <h3>{{ titleKey | translate }}</h3>
            <p class="text-500">{{ 'common.comingSoon' | translate }}</p>
        </div>
    `
})
export class ComingSoonComponent {
    @Input() titleKey = '';
}
