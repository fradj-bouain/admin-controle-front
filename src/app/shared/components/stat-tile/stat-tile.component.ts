import { Component, Input } from '@angular/core';

export type StatTileColor = 'blue' | 'green' | 'orange' | 'red' | 'yellow' | 'purple';

/**
 * Tuile de statistique réutilisable (Dashboard, blocs "Statistiques" des pages détail).
 * En mode normal : badge icône coloré + libellé + valeur, pensée pour occuper sa
 * propre carte (Dashboard).
 * En mode compact (grilles de plusieurs métriques dans un même bloc) : même principe
 * mais resserré en mini-carte à fond teinté, pour que chaque métrique reste
 * visuellement délimitée dans une grille dense.
 */
@Component({
    selector: 'app-stat-tile',
    template: `
        <div
            class="flex align-items-center gap-3 h-full"
            [class.p-3]="compact"
            [class.border-round-lg]="compact"
            [ngClass]="compact ? 'bg-' + color + '-50' : ''"
        >
            <div
                *ngIf="icon"
                class="flex align-items-center justify-content-center border-round-lg flex-shrink-0"
                [ngClass]="'bg-' + color + '-100'"
                [style.width]="compact ? '2.25rem' : '2.5rem'"
                [style.height]="compact ? '2.25rem' : '2.5rem'"
            >
                <i class="pi" [ngClass]="['pi-' + icon, 'text-' + color + '-600']" [class.text-base]="compact" [class.text-xl]="!compact"></i>
            </div>
            <div>
                <span class="block text-600 font-medium mb-1" [class.text-xs]="compact" [class.text-sm]="!compact">{{ label }}</span>
                <div class="text-900 font-bold" [class.text-xl]="compact" [class.text-2xl]="!compact">{{ value }}</div>
            </div>
        </div>
    `
})
export class StatTileComponent {
    @Input() label = '';
    @Input() value: string | number = '';
    @Input() icon?: string;
    @Input() color: StatTileColor = 'blue';
    @Input() compact = false;
}
