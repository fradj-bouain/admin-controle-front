import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CreateControleTiersRequest } from '../models/configuration.model';

@Component({
    selector: 'app-controle-tiers-form-dialog',
    templateUrl: './controle-tiers-form-dialog.component.html'
})
export class ControleTiersFormDialogComponent {

    @Input() visible = false;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() created = new EventEmitter<CreateControleTiersRequest>();

    form = this.fb.group({
        nom: ['', Validators.required]
    });

    constructor(private fb: FormBuilder) { }

    close() {
        this.visible = false;
        this.visibleChange.emit(false);
        this.form.reset();
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.created.emit({ nom: this.form.getRawValue().nom! });
        this.close();
    }
}
