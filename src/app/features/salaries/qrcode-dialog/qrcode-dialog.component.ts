import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { QrCodeService } from '../services/qrcode.service';
import { QrCode } from '../models/qrcode.model';
import { Salarie } from '../models/salarie.model';
import { Entreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { ReferenceDataService } from 'src/app/features/configuration/services/reference-data.service';

@Component({
    selector: 'app-qrcode-dialog',
    templateUrl: './qrcode-dialog.component.html'
})
export class QrCodeDialogComponent implements OnChanges {

    @Input() visible = false;
    @Input() salarie: Salarie | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();

    @ViewChild('badgeCard') badgeCard?: ElementRef<HTMLElement>;

    qrCode: QrCode | null = null;
    imageUrl: string | null = null;
    loading = false;
    notFound = false;
    generatingPdf = false;

    entreprise: Entreprise | null = null;
    fonctionLibelle = '';

    constructor(
        private qrCodeService: QrCodeService,
        private entrepriseService: EntrepriseService,
        private referenceDataService: ReferenceDataService
    ) { }

    ngOnChanges(): void {
        if (this.visible && this.salarie) {
            this.charger();
        }
    }

    get initiales(): string {
        if (!this.salarie) {
            return '';
        }
        return `${this.salarie.prenom.charAt(0)}${this.salarie.nom.charAt(0)}`.toUpperCase();
    }

    private charger() {
        if (!this.salarie) {
            return;
        }
        this.loading = true;
        this.notFound = false;
        this.revokeImage();
        this.chargerInfosComplementaires();
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

    private chargerInfosComplementaires() {
        this.entreprise = null;
        this.fonctionLibelle = '';
        if (!this.salarie) {
            return;
        }
        if (this.salarie.entrepriseEmployeurId) {
            this.entrepriseService.obtenir(this.salarie.entrepriseEmployeurId).subscribe((e) => (this.entreprise = e));
        }
        if (this.salarie.fonctionId) {
            const fonctionId = this.salarie.fonctionId;
            this.referenceDataService.listerSalarieFonction().subscribe((fonctions) => {
                this.fonctionLibelle = fonctions.find((f) => f.id === fonctionId)?.libelle ?? '';
            });
        }
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

    async telechargerPdf() {
        if (!this.salarie || this.generatingPdf) {
            return;
        }
        this.generatingPdf = true;
        try {
            const pdf = await this.construirePdf();
            pdf.save(`badge-${this.slug(this.salarie.prenom)}-${this.slug(this.salarie.nom)}.pdf`);
        } finally {
            this.generatingPdf = false;
        }
    }

    async imprimer() {
        if (!this.salarie || this.generatingPdf) {
            return;
        }
        this.generatingPdf = true;
        try {
            const pdf = await this.construirePdf();
            pdf.autoPrint();
            window.open(pdf.output('bloburl').toString(), '_blank');
        } finally {
            this.generatingPdf = false;
        }
    }

    private async construirePdf(): Promise<jsPDF> {
        const element = this.badgeCard!.nativeElement;
        const canvas = await html2canvas(element, { scale: 3, backgroundColor: '#ffffff', useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const largeurMm = 54;
        const hauteurMm = (canvas.height / canvas.width) * largeurMm;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [largeurMm, hauteurMm] });
        pdf.addImage(imgData, 'PNG', 0, 0, largeurMm, hauteurMm);
        return pdf;
    }

    private slug(value: string): string {
        return value
            .toLowerCase()
            .normalize('NFD')
            .replace(/[^\x00-\x7f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
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
