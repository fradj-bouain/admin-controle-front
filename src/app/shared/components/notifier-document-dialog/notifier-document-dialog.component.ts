import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

export interface NotifierDocumentPayload {
    email: string;
    sujet: string;
    description: string;
}

@Component({
    selector: 'app-notifier-document-dialog',
    templateUrl: './notifier-document-dialog.component.html'
})
export class NotifierDocumentDialogComponent implements OnChanges {

    @Input() visible = false;
    @Input() emailsCandidats: string[] = [];
    @Input() sujetParDefaut = '';
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() confirme = new EventEmitter<NotifierDocumentPayload>();

    form = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        sujet: ['', Validators.required],
        description: ['', Validators.required]
    });

    constructor(private fb: FormBuilder) { }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['visible']?.currentValue === true) {
            this.form.reset({
                email: this.emailsCandidats[0] ?? '',
                sujet: this.sujetParDefaut,
                description: ''
            });
        }
    }

    close() {
        this.visible = false;
        this.visibleChange.emit(false);
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        this.confirme.emit({ email: value.email!, sujet: value.sujet!, description: value.description! });
        this.close();
    }
}
