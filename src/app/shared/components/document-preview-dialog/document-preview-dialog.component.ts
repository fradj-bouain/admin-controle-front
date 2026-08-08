import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentService } from 'src/app/features/documents/services/document.service';
import { ModeApercu, formaterTaille, resolveApercuMode } from 'src/app/shared/utils/document-preview.util';

/**
 * Aperçu in-app d'un document déjà déposé — "Ouvrir → Aperçu → Inspection →
 * Téléchargement (si besoin)" côté admin/consultation. Ne nécessite jamais de
 * téléchargement pour inspecter le contenu ; le téléchargement reste une
 * action secondaire toujours disponible. Réutilise le même détecteur de mode
 * d'aperçu que le widget de dépôt (document-upload-preview) pour éviter toute
 * logique dupliquée entre les deux côtés du flux.
 */
@Component({
    selector: 'app-document-preview-dialog',
    templateUrl: './document-preview-dialog.component.html'
})
export class DocumentPreviewDialogComponent implements OnChanges {

    @Input() visible = false;
    @Input() documentId: string | null = null;
    @Input() nomFichier: string | null = null;
    @Input() typeMime: string | null = null;
    @Input() tailleOctets: number | null = null;
    @Output() visibleChange = new EventEmitter<boolean>();

    chargement = false;
    erreur: string | null = null;
    previewUrl: string | null = null;
    previewUrlSure: SafeResourceUrl | null = null;
    modeApercu: ModeApercu = 'indisponible';
    pleinEcran = false;

    constructor(private documentService: DocumentService, private sanitizer: DomSanitizer) { }

    get tailleFormatee(): string {
        return formaterTaille(this.tailleOctets);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible']?.currentValue && this.documentId) {
            this.charger();
        }
        if (changes['visible'] && !this.visible) {
            this.nettoyer();
        }
    }

    telecharger() {
        if (!this.documentId) {
            return;
        }
        this.documentService.telechargerBlob(this.documentId).subscribe({
            next: (blob) => {
                const url = URL.createObjectURL(blob);
                const lien = document.createElement('a');
                lien.href = url;
                lien.download = this.nomFichier || 'document';
                lien.click();
                URL.revokeObjectURL(url);
            },
            error: () => (this.erreur = 'Téléchargement impossible.')
        });
    }

    basculerPleinEcran() {
        this.pleinEcran = !this.pleinEcran;
    }

    close() {
        this.visible = false;
        this.visibleChange.emit(false);
        this.nettoyer();
    }

    private charger() {
        this.chargement = true;
        this.erreur = null;
        this.modeApercu = resolveApercuMode(this.typeMime, this.nomFichier);
        this.documentService.apercuBlob(this.documentId!).subscribe({
            next: (blob) => {
                this.previewUrl = URL.createObjectURL(blob);
                this.previewUrlSure = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
                this.chargement = false;
            },
            error: () => {
                this.erreur = 'Aperçu indisponible.';
                this.chargement = false;
            }
        });
    }

    private nettoyer() {
        if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
        }
        this.previewUrl = null;
        this.previewUrlSure = null;
        this.pleinEcran = false;
    }
}
