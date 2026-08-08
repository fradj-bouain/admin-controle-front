import { Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ModeApercu, extraireExtension, formaterTaille, resolveApercuMode } from 'src/app/shared/utils/document-preview.util';

/**
 * Widget de dépôt de fichier avec aperçu immédiat avant tout envoi réseau —
 * "Upload → Aperçu → Vérification" : purement du staging côté client (aucun
 * appel HTTP ici), le composant parent envoie le File choisi au moment où
 * l'utilisateur confirme via son propre bouton existant ("Enregistrer" /
 * "Renseigner"). Modelé sur ModeleFichierUploadComponent (même mécanique
 * dragover/drop) mais avec un vrai rendu du contenu, pas juste le nom du fichier.
 */
@Component({
    selector: 'app-document-upload-preview',
    templateUrl: './document-upload-preview.component.html'
})
export class DocumentUploadPreviewComponent implements OnDestroy {

    @Input() label = '';
    @Input() acceptedExtensions = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.odt';
    @Input() maxSizeMo = 10;
    @Output() fichierChange = new EventEmitter<File | null>();

    @ViewChild('fileInput') private fileInputRef!: ElementRef<HTMLInputElement>;

    fichier: File | null = null;
    previewUrl: string | null = null;
    previewUrlSure: SafeResourceUrl | null = null;
    modeApercu: ModeApercu = 'indisponible';
    erreur: string | null = null;
    survole = false;

    constructor(private sanitizer: DomSanitizer) { }

    get extension(): string {
        return extraireExtension(this.fichier?.name);
    }

    get tailleFormatee(): string {
        return this.fichier ? formaterTaille(this.fichier.size) : '';
    }

    get formatsAffiches(): string {
        return this.acceptedExtensions.split(',').map((e) => e.trim().replace('.', '').toUpperCase()).join(' · ');
    }

    ouvrirSelecteur() {
        this.fileInputRef.nativeElement.click();
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        this.survole = true;
    }

    onDragLeave() {
        this.survole = false;
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        this.survole = false;
        this.selectionner(event.dataTransfer?.files?.[0] ?? null);
    }

    onFichierChoisi(event: Event) {
        const input = event.target as HTMLInputElement;
        this.selectionner(input.files?.[0] ?? null);
        // Repart de zéro : re-choisir exactement le même fichier après un "Retirer"
        // ne déclencherait sinon plus l'événement 'change' (même valeur).
        input.value = '';
    }

    retirer(event?: Event) {
        event?.stopPropagation();
        this.nettoyerApercu();
        this.fichier = null;
        this.erreur = null;
        this.fichierChange.emit(null);
    }

    private selectionner(fichier: File | null) {
        if (!fichier) {
            return;
        }
        const extension = extraireExtension(fichier.name);
        const extensionsAutorisees = this.acceptedExtensions.split(',')
            .map((e) => e.trim().replace('.', '').toLowerCase());
        if (!extensionsAutorisees.includes(extension)) {
            this.erreur = `Type de fichier non accepté (formats acceptés : ${this.formatsAffiches}).`;
            return;
        }
        if (fichier.size > this.maxSizeMo * 1024 * 1024) {
            this.erreur = `Le fichier dépasse la taille maximale autorisée (${this.maxSizeMo} Mo).`;
            return;
        }
        this.erreur = null;
        this.nettoyerApercu();
        this.fichier = fichier;
        this.modeApercu = resolveApercuMode(fichier.type, fichier.name);
        this.previewUrl = URL.createObjectURL(fichier);
        this.previewUrlSure = this.sanitizer.bypassSecurityTrustResourceUrl(this.previewUrl);
        this.fichierChange.emit(fichier);
    }

    private nettoyerApercu() {
        if (this.previewUrl) {
            URL.revokeObjectURL(this.previewUrl);
        }
        this.previewUrl = null;
        this.previewUrlSure = null;
    }

    ngOnDestroy(): void {
        this.nettoyerApercu();
    }
}
