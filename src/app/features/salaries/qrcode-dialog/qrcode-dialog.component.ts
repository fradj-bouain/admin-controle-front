import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { QrCodeService } from '../services/qrcode.service';
import { QrCode } from '../models/qrcode.model';
import { Salarie } from '../models/salarie.model';

@Component({
    selector: 'app-qrcode-dialog',
    templateUrl: './qrcode-dialog.component.html'
})
export class QrCodeDialogComponent implements OnChanges {

    @Input() visible = false;
    @Input() salarie: Salarie | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();

    qrCode: QrCode | null = null;
    imageUrl: string | null = null;
    loading = false;
    notFound = false;

    constructor(private qrCodeService: QrCodeService) { }

    ngOnChanges(): void {
        if (this.visible && this.salarie) {
            this.charger();
        }
    }

    private charger() {
        if (!this.salarie) {
            return;
        }
        this.loading = true;
        this.notFound = false;
        this.revokeImage();
        this.qrCodeService.obtenir(this.salarie.id).subscribe({
            next: (qrCode) => {
                this.qrCode = qrCode;
                this.chargerImage();
            },
            error: () => {
                this.qrCode = null;
                this.notFound = true;
                this.loading = false;
            }
        });
    }

    private chargerImage() {
        if (!this.salarie) {
            return;
        }
        this.qrCodeService.telechargerImage(this.salarie.id).subscribe({
            next: (blob) => {
                this.imageUrl = URL.createObjectURL(blob);
                this.loading = false;
            },
            error: () => (this.loading = false)
        });
    }

    generer() {
        if (!this.salarie) {
            return;
        }
        this.loading = true;
        this.qrCodeService.generer(this.salarie.id).subscribe({
            next: () => this.charger(),
            error: () => (this.loading = false)
        });
    }

    regenerer() {
        if (!this.salarie) {
            return;
        }
        this.loading = true;
        this.qrCodeService.regenerer(this.salarie.id).subscribe({
            next: () => this.charger(),
            error: () => (this.loading = false)
        });
    }

    close() {
        this.visible = false;
        this.visibleChange.emit(false);
        this.revokeImage();
        this.qrCode = null;
    }

    private revokeImage() {
        if (this.imageUrl) {
            URL.revokeObjectURL(this.imageUrl);
            this.imageUrl = null;
        }
    }
}
