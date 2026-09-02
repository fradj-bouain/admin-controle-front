import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';

export interface SectionNavItem {
    id: string;
    label: string;
    // Suffixe d'icône PrimeIcons (sans le préfixe "pi pi-"), ex: "user" → pi-user.
    icon: string;
}

/**
 * Barre de navigation collante entre les blocs d'une fiche longue (Entreprise/Chantier/
 * Salarié) + bouton "remonter en haut" — demande client explicite : trop de scroll pour
 * atteindre les derniers blocs d'une fiche. Prototype validé (barre à indicateur glissant,
 * même principe qu'une navigation de landing page) avant implémentation ici.
 *
 * Les sections ciblées (un id par bloc, voir `sections`) vivent dans le template de la
 * page hôte, pas dans celui-ci — recherchées via document.getElementById à chaque calcul
 * plutôt que mises en cache une fois pour toutes : certains blocs (ex: Identité/Coordonnées
 * sur la fiche Entreprise) sont dans un <form *ngIf="!loading"> qui n'existe pas encore au
 * premier rendu (la fiche est encore en train de charger) — les mettre en cache trop tôt les
 * excluait silencieusement de la détection pour tout le reste de la vie du composant (bug
 * constaté : un seul bloc restait jamais actif).
 *
 * Détection du bloc actif : PAS un IntersectionObserver à bande étroite (rootMargin) — sur
 * une mise en page à deux colonnes (ex: Identité à gauche, Statistiques à droite), plusieurs
 * blocs partagent la même position verticale et "gagnent" au hasard selon l'ordre des
 * callbacks. À la place, un calcul simple et déterministe au scroll : le dernier bloc dont le
 * haut a franchi une ligne de référence juste sous la barre — en cas d'égalité verticale
 * (colonnes côte à côte), le premier de `sections` l'emporte (comparaison stricte `>`).
 */
@Component({
    selector: 'app-section-nav',
    templateUrl: './section-nav.component.html'
})
export class SectionNavComponent implements AfterViewInit, OnDestroy {
    @Input() sections: SectionNavItem[] = [];

    @ViewChild('track') trackRef?: ElementRef<HTMLElement>;
    @ViewChild('highlight') highlightRef?: ElementRef<HTMLElement>;
    @ViewChild('wrap') wrapRef?: ElementRef<HTMLElement>;

    activeId = '';
    stuck = false;
    showScrollTop = false;

    private rafId?: number;
    private scrollHandler = () => this.demanderMiseAJour();
    private resizeHandler = () => this.demanderMiseAJour();
    // Le clic fixe déjà le bon onglet (voir aller()) : pendant le scroll animé qui l'amène
    // à l'écran, la page défile forcément devant TOUS les blocs intermédiaires, et sans ce
    // garde-fou le calcul au scroll (mettreAJourActif) rallumait chacun d'eux au passage —
    // on voyait plusieurs onglets se colorer l'un après l'autre au lieu d'un seul qui reste
    // actif. Suspendu le temps du scroll programmatique, réactivé à la fin (scrollend, avec
    // un filet de temporisation pour les navigateurs qui ne le supportent pas encore).
    private navigationEnCours = false;
    private finNavigationTimer?: ReturnType<typeof setTimeout>;
    private scrollEndHandler = () => this.terminerNavigation();

    ngAfterViewInit(): void {
        if (this.sections.length === 0) {
            return;
        }
        this.activeId = this.sections[0].id;
        window.addEventListener('scroll', this.scrollHandler, { passive: true });
        window.addEventListener('resize', this.resizeHandler);
        window.addEventListener('scrollend', this.scrollEndHandler);
        // Premier calcul après le rendu initial (et un second peu après, pour couvrir le cas
        // où la fiche est encore en train de charger au tout premier passage — voir le bloc
        // de commentaire ci-dessus).
        this.demanderMiseAJour();
        setTimeout(() => this.demanderMiseAJour(), 400);
    }

    ngOnDestroy(): void {
        if (this.rafId !== undefined) {
            cancelAnimationFrame(this.rafId);
        }
        if (this.finNavigationTimer !== undefined) {
            clearTimeout(this.finNavigationTimer);
        }
        window.removeEventListener('scroll', this.scrollHandler);
        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('scrollend', this.scrollEndHandler);
    }

    private terminerNavigation(): void {
        this.navigationEnCours = false;
        if (this.finNavigationTimer !== undefined) {
            clearTimeout(this.finNavigationTimer);
            this.finNavigationTimer = undefined;
        }
        // Recale une dernière fois sur la position réelle une fois le scroll bien arrêté
        // (le clic peut avoir visé une valeur légèrement différente du repos exact).
        this.mettreAJourActif();
        this.deplacerIndicateur();
    }

    private demanderMiseAJour(): void {
        if (this.rafId !== undefined) {
            return;
        }
        this.rafId = requestAnimationFrame(() => {
            this.rafId = undefined;
            this.mettreAJourActif();
            this.deplacerIndicateur();
        });
    }

    private ligneReference(): number {
        // Juste sous la barre collante (une fois accrochée) — hauteur réelle du bandeau,
        // pas une valeur fixe qui suppose sa taille.
        const hauteurBarre = this.wrapRef?.nativeElement.getBoundingClientRect().height ?? 0;
        return hauteurBarre + 24;
    }

    private mettreAJourActif(): void {
        if (this.navigationEnCours) {
            return;
        }
        const reference = this.ligneReference();
        let meilleur: string | undefined;
        let meilleurTop = -Infinity;
        for (const s of this.sections) {
            const el = document.getElementById(s.id);
            if (!el) {
                continue;
            }
            const top = el.getBoundingClientRect().top;
            // Comparaison stricte : en cas d'égalité (deux blocs côte à côte à la même
            // hauteur), celui déjà retenu (donc le premier de la liste) reste gagnant.
            if (top <= reference && top > meilleurTop) {
                meilleur = s.id;
                meilleurTop = top;
            }
        }
        if (meilleur && meilleur !== this.activeId) {
            this.activeId = meilleur;
        }
    }

    aller(item: SectionNavItem): void {
        const el = document.getElementById(item.id);
        if (!el) {
            return;
        }
        this.activeId = item.id;
        this.deplacerIndicateur();
        this.navigationEnCours = true;
        if (this.finNavigationTimer !== undefined) {
            clearTimeout(this.finNavigationTimer);
        }
        // Filet de secours si "scrollend" ne se déclenche pas (navigateur qui ne le supporte
        // pas encore, ou cible déjà à l'écran donc aucun scroll réel à conclure).
        this.finNavigationTimer = setTimeout(() => this.terminerNavigation(), 1000);
        const y = el.getBoundingClientRect().top + window.scrollY - this.ligneReference() + 8;
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }

    remonterEnHaut(): void {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Filet de sécurité : si un jour un appelant passe `sections` depuis une getter (nouveau
    // tableau à chaque cycle de détection), trackBy par id évite quand même qu'Angular ne
    // détruise/recrée les <button> en continu (voir le bug déjà rencontré ici et documenté
    // sur les pages hôtes — ces dernières utilisent maintenant des champs fixes, mais ce
    // composant partagé ne doit pas dépendre de la discipline de chaque appelant).
    trackById(_index: number, item: SectionNavItem): string {
        return item.id;
    }

    private deplacerIndicateur(): void {
        if (!this.trackRef || !this.highlightRef) {
            return;
        }
        const track = this.trackRef.nativeElement;
        const actif = track.querySelector<HTMLElement>(`[data-nav-id="${this.activeId}"]`);
        if (!actif) {
            return;
        }
        const trackRect = track.getBoundingClientRect();
        const boutonRect = actif.getBoundingClientRect();
        const highlight = this.highlightRef.nativeElement;
        highlight.style.width = `${boutonRect.width}px`;
        highlight.style.transform = `translateX(${boutonRect.left - trackRect.left + track.scrollLeft}px)`;
        this.stuck = this.wrapRef ? this.wrapRef.nativeElement.getBoundingClientRect().top <= 0 : false;
        this.showScrollTop = window.scrollY > 480;
    }
}
