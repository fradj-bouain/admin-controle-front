import { Pipe, PipeTransform } from '@angular/core';

/**
 * Traduit les valeurs de statut brutes (enum backend ou booléen `actif`) en
 * texte naturel pour l'affichage — jamais utilisé pour la logique, seulement
 * pour ce qui apparaît à l'écran (voir audit UX : "ACTIF"/"EN_ATTENTE" en
 * majuscules brutes se lisaient comme une valeur technique plutôt qu'un
 * statut pensé pour l'écran). Les valeurs inconnues sont dégradées
 * proprement (tiret bas → espace, casse phrase) plutôt que de planter.
 */
const LIBELLES: Record<string, string> = {
    ACTIF: 'Actif',
    INACTIF: 'Inactif',
    EN_ATTENTE: 'En attente',
    VALIDE: 'Validé',
    REFUSE: 'Refusé',
    ACCORDE: 'Accordé'
};

@Pipe({ name: 'etatLabel' })
export class EtatLabelPipe implements PipeTransform {
    transform(valeur: string | boolean | null | undefined): string {
        if (typeof valeur === 'boolean') {
            return valeur ? 'Actif' : 'Inactif';
        }
        if (!valeur) {
            return '';
        }
        if (LIBELLES[valeur]) {
            return LIBELLES[valeur];
        }
        const texte = valeur.replace(/_/g, ' ').toLowerCase();
        return texte.charAt(0).toUpperCase() + texte.slice(1);
    }
}
