import { ErrorHandler, Injectable } from '@angular/core';

/**
 * Filet de sécurité : sans ceci, une exception non interceptée dans un template/handler
 * (ex: un getter qui casse, une Date invalide passée à toISOString()) s'affiche seulement
 * dans la console — invisible pour quiconque n'a pas les outils de développement ouverts,
 * ce qui ressemble alors à "la page a planté" sans aucune piste (voir investigation du
 * plantage signalé sur "Ajouter un chantier", jamais reproduit faute de message exploitable).
 *
 * Écrit directement dans le DOM (pas de composant Angular, pas de MessageService) car
 * une exception non gérée peut survenir alors qu'Angular lui-même est dans un état cassé —
 * un bandeau construit à la main reste visible même si le rendu Angular ne peut plus
 * se mettre à jour normalement.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {

    handleError(error: unknown): void {
        // Toujours logué en premier : si le bandeau lui-même échoue à s'afficher pour une
        // raison quelconque, l'erreur reste au moins visible dans la console.
        console.error('Erreur non interceptée :', error);

        try {
            this.afficherBandeau(error);
        } catch (erreurAffichage) {
            console.error('Impossible d\'afficher le bandeau d\'erreur :', erreurAffichage);
        }
    }

    private afficherBandeau(error: unknown): void {
        const message = error instanceof Error ? (error.stack || error.message) : String(error);
        const id = 'global-error-banner';
        // Une seule bannière à la fois : une exception répétée (ex: dans une boucle de
        // détection de changements) ne doit pas empiler des dizaines de bandeaux identiques.
        document.getElementById(id)?.remove();

        const banner = document.createElement('div');
        banner.id = id;
        banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:999999;'
            + 'background:#3a1414;color:#fbe4e1;font:12px/1.5 ui-monospace,Consolas,monospace;'
            + 'max-height:40vh;overflow:auto;padding:12px 16px;border-top:3px solid #c2453d;'
            + 'box-shadow:0 -4px 16px rgba(0,0,0,.4);white-space:pre-wrap;word-break:break-word;';

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;'
            + 'margin-bottom:8px;font-family:sans-serif;font-weight:700;font-size:13px;';
        header.innerHTML = '<span>⚠ Erreur application — copiez ce texte et envoyez-le</span>';

        const boutons = document.createElement('div');
        boutons.style.cssText = 'display:flex;gap:8px;';

        const boutonCopier = document.createElement('button');
        boutonCopier.textContent = 'Copier';
        boutonCopier.style.cssText = 'background:#c2453d;color:#fff;border:none;border-radius:4px;'
            + 'padding:4px 10px;cursor:pointer;font-family:sans-serif;font-size:12px;';
        boutonCopier.onclick = () => {
            navigator.clipboard?.writeText(message).then(
                () => (boutonCopier.textContent = 'Copié !'),
                () => (boutonCopier.textContent = 'Échec — sélectionnez le texte à la main')
            );
        };

        const boutonFermer = document.createElement('button');
        boutonFermer.textContent = 'Fermer';
        boutonFermer.style.cssText = 'background:transparent;color:#fbe4e1;border:1px solid #fbe4e1;'
            + 'border-radius:4px;padding:4px 10px;cursor:pointer;font-family:sans-serif;font-size:12px;';
        boutonFermer.onclick = () => banner.remove();

        boutons.append(boutonCopier, boutonFermer);
        header.appendChild(boutons);

        const corps = document.createElement('div');
        corps.textContent = message;

        banner.append(header, corps);
        document.body.appendChild(banner);
    }
}
