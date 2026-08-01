import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-modele-fichier-upload',
    templateUrl: './modele-fichier-upload.component.html'
})
export class ModeleFichierUploadComponent {

    @Input() label = 'Fichier modèle ODT / PDF';
    @Input() aide = 'Balises disponibles : [DATE], [CLIENT_NOM], [CHANTIER_NOM], [ENTREPRISE_NOM]';
    @Input() fichierNom: string | null = null;
    @Output() fichierNomChange = new EventEmitter<string | null>();
    @Output() fichierChange = new EventEmitter<File | null>();

    survole = false;

    get extension(): string {
        if (!this.fichierNom) {
            return '';
        }
        return this.fichierNom.split('.').pop()?.toUpperCase() ?? '';
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
        const fichier = event.dataTransfer?.files?.[0] ?? null;
        this.emettre(fichier);
    }

    onFichierChoisi(event: Event) {
        const input = event.target as HTMLInputElement;
        this.emettre(input.files?.[0] ?? null);
    }

    retirer(event: Event) {
        event.stopPropagation();
        this.emettre(null);
    }

    private emettre(fichier: File | null) {
        this.fichierNom = fichier?.name ?? null;
        this.fichierNomChange.emit(this.fichierNom);
        this.fichierChange.emit(fichier);
    }
}
