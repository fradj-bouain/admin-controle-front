import { Component, Input } from '@angular/core';

export type StatTileColor = 'blue' | 'green' | 'orange' | 'red' | 'yellow' | 'purple';

/**
 * Tuile de statistique réutilisable (Dashboard, blocs "Statistiques" des pages détail).
 * En mode normal : badge icône coloré + libellé + valeur.
 * En mode compact (grilles de chiffres denses) : pastille de couleur + libellé + valeur,
 * la couleur ne porte jamais sur le chiffre lui-même (il reste en encre neutre).
 */
@Component({
    selector: 'app-stat-tile',
    template: `
        <div class="flex align-items-center" [class.gap-3]="!compact" [class.gap-2]="compact">
            <div
                *ngIf="!compact && icon"
                class="flex align-items-center justify-content-center border-round flex-shrink-0"
                [ngClass]="'bg-' + color + '-100'"
                style="width:2.5rem;height:2.5rem"
            >
                <i class="pi text-xl" [ngClass]="['pi-' + icon, 'text-' + color + '-500']"></i>
            </div>
            <div>
                <span class="block text-500 font-medium" [class.mb-2]="!compact" [class.text-sm]="compact">{{ label }}</span>
                <div class="text-900 font-bold flex align-items-center gap-2" [class.text-xl]="!compact" [class.text-2xl]="!compact">
                    <span *ngIf="compact" class="stat-tile-dot" [ngClass]="'bg-' + color + '-500'"></span>
                    {{ value }}
                </div>
            </div>
        </div>
    `,
    styles: [`
        .stat-tile-dot {
            display: inline-block;
            width: 0.6rem;
            height: 0.6rem;
            border-radius: 50%;
        }
    `]
})
export class StatTileComponent {
    @Input() label = '';
    @Input() value: string | number = '';
    @Input() icon?: string;
    @Input() color: StatTileColor = 'blue';
    @Input() compact = false;
}
