import { Component, Input } from '@angular/core';

/** Placeholder animé affiché à la place d'une fiche (détail/formulaire) tant
 * que son entité n'a pas fini de charger — évite l'apparition brute d'un
 * formulaire vide puis rempli d'un coup. */
@Component({
    selector: 'app-card-skeleton',
    templateUrl: './card-skeleton.component.html'
})
export class CardSkeletonComponent {
    @Input() lignes = 4;
    @Input() colonnes: 1 | 2 = 2;

    get ligneIndices(): number[] {
        return Array.from({ length: this.lignes }, (_, i) => i);
    }
}
