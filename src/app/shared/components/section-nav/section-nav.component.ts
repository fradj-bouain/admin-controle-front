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
 * page hôte, pas dans celui-ci — observées via document.getElementById/IntersectionObserver
 * plutôt que via ViewChild, seule option pour un composant générique réutilisable sur
 * plusieurs fiches aux blocs différents.
 */
@Component({
    selector: 'app-section-nav',
    templateUrl: './section-nav.component.html'
})
export class SectionNavComponent implements AfterViewInit, OnDestroy {
    @Input() sections: SectionNavItem[] = [];

    @ViewChild('track') trackRef?: ElementRef<HTMLElement>;
    @ViewChild('highlight') highlightRef?: ElementRef<HTMLElement>;
    @ViewChild('sentinel') sentinelRef?: ElementRef<HTMLElement>;

    activeId = '';
    stuck = false;
    showScrollTop = false;

    private sectionObserver?: IntersectionObserver;
    private stickyObserver?: IntersectionObserver;
    private scrollHandler = () => (this.showScrollTop = window.scrollY > 480);
    private resizeHandler = () => this.deplacerIndicateur();

    ngAfterViewInit(): void {
        if (this.sections.length === 0) {
            return;
        }
        this.activeId = this.sections[0].id;
        // Les sections visées sont ajoutées au DOM par la page hôte au même cycle — un
        // setTimeout(0) suffit à laisser Angular terminer son propre rendu avant qu'on
        // aille chercher leurs éléments.
        setTimeout(() => this.initialiser());
        window.addEventListener('scroll', this.scrollHandler, { passive: true });
        window.addEventListener('resize', this.resizeHandler);
    }

    ngOnDestroy(): void {
        this.sectionObserver?.disconnect();
        this.stickyObserver?.disconnect();
        window.removeEventListener('scroll', this.scrollHandler);
        window.removeEventListener('resize', this.resizeHandler);
    }

    private initialiser(): void {
        this.deplacerIndicateur();

        if (this.sentinelRef) {
            this.stickyObserver = new IntersectionObserver(
                (entries) => (this.stuck = !entries[0].isIntersecting),
                { threshold: 0 }
            );
            this.stickyObserver.observe(this.sentinelRef.nativeElement);
        }

        const cibles = this.sections
            .map((s) => document.getElementById(s.id))
            .filter((el): el is HTMLElement => !!el);
        this.sectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const id = entry.target.getAttribute('id');
                        if (id) {
                            this.definirActif(id);
                        }
                    }
                });
            },
            { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
        );
        cibles.forEach((el) => this.sectionObserver!.observe(el));
    }

    definirActif(id: string): void {
        if (id === this.activeId) {
            return;
        }
        this.activeId = id;
        this.deplacerIndicateur();
    }

    aller(item: SectionNavItem): void {
        this.definirActif(item.id);
        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    remonterEnHaut(): void {
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
    }
}
