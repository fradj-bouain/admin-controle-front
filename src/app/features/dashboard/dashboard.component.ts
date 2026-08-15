import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ChantierService } from '../chantiers/services/chantier.service';
import { ClientService } from '../clients/services/client.service';
import { EntrepriseService } from '../entreprises/services/entreprise.service';
import { SalarieService } from '../salaries/services/salarie.service';
import { AffectationSalarieChantierService } from '../salaries/services/affectation-salarie-chantier.service';
import { ReferenceDataService } from '../configuration/services/reference-data.service';
import { ControleService } from '../controles/services/controle.service';
import { DocumentEnAttente, DocumentItem } from '../documents/models/document.model';
import { DocumentService } from '../documents/services/document.service';
import { TypeDocumentService } from '../documents/services/type-document.service';
import { AuthService } from 'src/app/core/auth/auth.service';

interface EtatEntite {
    total: number;
    actifs: number;
    inactifs: number;
}

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {

    chargement = true;

    // Un compte Contrôleur n'a pas de périmètre sur chantiers/entreprises/salariés
    // (volontairement inchangé) — son dashboard montre ses contrôles/rapports à la
    // place, plutôt que des chiffres qui ne le concernent pas.
    estControleur = false;
    // Un compte Entreprise a son propre dashboard (voir chargerDashboardEntreprise) :
    // la tuile "Entreprises" du dashboard standard n'a aucun sens pour lui (il ne voit
    // jamais que sa propre fiche, donc toujours "1/1"), et rien n'y montrait sa
    // conformité documentaire — le sujet qui l'intéresse le plus au quotidien.
    estEntreprise = false;
    // Un compte Client a lui aussi son propre dashboard (voir chargerDashboardClient) :
    // le dashboard standard montre des listings/graphiques (parc, types de contrat) qui
    // ne le concernent pas — un maître d'ouvrage veut une vue d'ensemble rassurante de
    // SES chantiers, des entreprises qui y interviennent et des contrôles effectués.
    // Tout ce qui est chargé ici passe par les endpoints déjà scopés côté backend
    // (voir ChantierService.listerIdsAccessiblesPourClient) : un compte "responsable
    // de chantier" ne voit ici que ses chantiers assignés, un compte "accès total" voit
    // tout le périmètre du client — sans logique de filtrage supplémentaire ici.
    estClient = false;

    statChantiers: EtatEntite | null = null;
    statEntreprises: EtatEntite | null = null;
    statSalaries: EtatEntite | null = null;
    // Exploite `chantierActuel` (déjà calculé par le backend sur la liste des salariés,
    // voir SalarieController) : combien sont actuellement déployés sur un chantier plutôt
    // qu'actifs/inactifs administrativement — la question qu'un responsable se pose au
    // quotidien (voir audit UX).
    statSalariesChantier: { surChantier: number; disponibles: number } | null = null;

    statControles: EtatEntite | null = null;
    statRapports: EtatEntite | null = null;

    chartEtatParc: any;
    chartTypesContrat: any;
    chartOptions: any;

    // Visible uniquement pour le compte interne (SUPER_ADMIN) : un compte
    // Entreprise/Client/Contrôleur n'a pas accès à GET /documents/en-attente.
    peutVoirDocumentsEnAttente = false;
    documentsEnAttente: DocumentEnAttente[] = [];

    // --- Dashboard Entreprise (voir chargerDashboardEntreprise) ---
    nomEntreprise = '';
    statDocumentsEntreprise: { fournis: number; total: number; pourcentage: number } | null = null;
    nbDocumentsExpirantBientot = 0;
    documentsATraiter: Array<{ libelle: string; sousTitre: string; severite: 'warn' | 'danger' }> = [];
    mesChantiersActifs: Array<{ nom: string; nomClient: string }> = [];
    activiteRecente: Array<{ date: string; texte: string }> = [];

    // --- Dashboard Client (voir chargerDashboardClient) ---
    nomClient = '';
    banniereClientOk = true;
    banniereClientTexte = '';
    nbEntreprisesIntervenantes = 0;
    nbEntreprisesPrincipales = 0;
    nbEntreprisesSousTraitantes = 0;
    // Phrase d'échéance plutôt qu'une fraction sèche — voir statControles ci-dessous
    // pour le compte X/Y, cette ligne répond à "et maintenant, c'est pour quand ?".
    prochainControleTexte = '';
    prochainControleOk = true;
    // Personnes distinctes (voir GET /salaries, déjà dédupliqué côté backend) — peut être
    // inférieur au nombre de postes ci-dessous si une même personne intervient sur
    // plusieurs de vos chantiers (retour client : "1" seul semblait faux/trop bas alors
    // qu'il s'agissait d'une seule personne déployée sur 2 chantiers, pas un bug).
    nbSalariesSurChantiers = 0;
    nbPostesSalariesClient = 0;
    statutAccesSalariesClient: { accorde: number; enAttente: number; refuse: number } = { accorde: 0, enAttente: 0, refuse: 0 };
    mesChantiersClient: Array<{ id: string; nom: string; ville?: string; statut: string }> = [];
    entreprisesSurMesChantiers: Array<{ id: string; raisonSociale: string; chantierActuel?: string | null; rangActuel?: string | null }> = [];
    derniersControlesClient: Array<{ chantierNom: string; date: string; termine: boolean }> = [];

    constructor(
        private chantierService: ChantierService,
        private clientService: ClientService,
        private entrepriseService: EntrepriseService,
        private salarieService: SalarieService,
        private affectationSalarieService: AffectationSalarieChantierService,
        private referenceDataService: ReferenceDataService,
        private controleService: ControleService,
        private documentService: DocumentService,
        private typeDocumentService: TypeDocumentService,
        private auth: AuthService
    ) { }

    ngOnInit(): void {
        this.peutVoirDocumentsEnAttente = this.auth.hasRole('SUPER_ADMIN');
        if (this.peutVoirDocumentsEnAttente) {
            this.documentService.listerEnAttente().subscribe((documents) => (this.documentsEnAttente = documents));
        }

        this.estControleur = this.auth.hasRole('CONTROLEUR');
        this.estEntreprise = this.auth.hasRole('ENTREPRISE');
        this.estClient = this.auth.hasRole('CLIENT');

        const style = getComputedStyle(document.documentElement);
        const texteSecondaire = style.getPropertyValue('--text-color-secondary') || '#6b7280';
        const bordure = style.getPropertyValue('--surface-border') || '#e5e7eb';

        this.chartOptions = {
            plugins: {
                legend: { labels: { color: texteSecondaire } }
            },
            scales: {
                x: { ticks: { color: texteSecondaire }, grid: { color: 'transparent' } },
                y: { ticks: { color: texteSecondaire, precision: 0 }, grid: { color: bordure }, beginAtZero: true }
            }
        };

        if (this.estControleur) {
            this.chargerDashboardControleur();
        } else if (this.estEntreprise) {
            this.chargerDashboardEntreprise();
        } else if (this.estClient) {
            this.chargerDashboardClient();
        } else {
            this.chargerDashboardStandard();
        }
    }

    private chargerDashboardControleur(): void {
        forkJoin({
            controles: this.controleService.lister(),
            rapports: this.controleService.listerRapports()
        }).subscribe({
            next: ({ controles, rapports }) => {
                this.statControles = this.calculerEtat(controles, (c) => c.termine);
                this.statRapports = this.calculerEtat(rapports, (r) => !!r.dateEnvoi);
                this.chargement = false;
            },
            error: () => (this.chargement = false)
        });
    }

    private chargerDashboardStandard(): void {
        forkJoin({
            chantiers: this.chantierService.lister(),
            entreprises: this.entrepriseService.lister(),
            salaries: this.salarieService.lister(),
            typesContrat: this.referenceDataService.listerTypeContratSalarie()
        }).subscribe({
            next: ({ chantiers, entreprises, salaries, typesContrat }) => {
                this.statChantiers = this.calculerEtat(chantiers, (c) => c.statut === 'ACTIF');
                this.statEntreprises = this.calculerEtat(entreprises, (e) => e.actif);
                this.statSalaries = this.calculerEtat(salaries, (s) => s.statut === 'ACTIF');
                this.statSalariesChantier = {
                    surChantier: salaries.filter((s) => !!s.chantierActuel).length,
                    disponibles: salaries.filter((s) => !s.chantierActuel).length
                };

                this.chartEtatParc = {
                    labels: ['Chantiers', 'Entreprises', 'Salariés'],
                    datasets: [
                        {
                            label: 'Actifs',
                            backgroundColor: '#22c55e',
                            borderRadius: 4,
                            data: [this.statChantiers.actifs, this.statEntreprises.actifs, this.statSalaries.actifs]
                        },
                        {
                            label: 'Inactifs',
                            backgroundColor: '#ef4444',
                            borderRadius: 4,
                            data: [this.statChantiers.inactifs, this.statEntreprises.inactifs, this.statSalaries.inactifs]
                        }
                    ]
                };

                this.chartTypesContrat = {
                    labels: typesContrat.map((t) => t.libelle),
                    datasets: [
                        {
                            label: 'Salariés',
                            backgroundColor: '#3b82f6',
                            borderRadius: 4,
                            data: typesContrat.map((t) => salaries.filter((s) => s.typeContratId === t.id).length)
                        }
                    ]
                };

                this.chargement = false;
            },
            error: () => (this.chargement = false)
        });
    }

    /**
     * Dashboard Entreprise : conformité documentaire (même calcul que la carte Documents
     * de la fiche entreprise, voir EntrepriseDetailComponent.recalculerTypesPourEntreprise),
     * chantiers/salariés déjà scopés par le backend, historique des documents en guise
     * d'activité récente. Volontairement limité aux documents de l'ENTREPRISE elle-même
     * (pas ceux de chaque salarié un par un : aucune API ne les renvoie en un seul appel,
     * et ça resterait visible/agissable depuis la fiche de chaque salarié).
     */
    private chargerDashboardEntreprise(): void {
        const entrepriseId = this.auth.entrepriseId;
        if (!entrepriseId) {
            this.chargement = false;
            return;
        }
        forkJoin({
            entreprises: this.entrepriseService.lister(),
            types: this.typeDocumentService.lister(),
            documents: this.documentService.listerParEntreprise(entrepriseId),
            chantiers: this.chantierService.lister(),
            clients: this.clientService.lister(),
            salaries: this.salarieService.lister(),
            historique: this.documentService.historiqueParEntreprise(entrepriseId)
        }).subscribe({
            next: ({ entreprises, types, documents, chantiers, clients, salaries, historique }) => {
                const entreprise = entreprises[0];
                this.nomEntreprise = entreprise?.raisonSociale ?? '';

                const documentsByType: Record<string, DocumentItem> = {};
                documents.forEach((d) => (documentsByType[d.typeDocumentId] = d));

                const typesPourEntreprise = types.filter((t) => {
                    if (t.cible !== 'ENTREPRISE') {
                        return false;
                    }
                    if (t.corpsDeMetierId && t.corpsDeMetierId !== entreprise?.corpsDeMetierId) {
                        return false;
                    }
                    if (t.paysId && t.paysId !== entreprise?.paysId) {
                        return false;
                    }
                    return true;
                });
                const obligatoires = typesPourEntreprise.filter((t) => t.obligatoire);
                const manquants = obligatoires.filter((t) => !documentsByType[t.id]);
                const fournis = obligatoires.length - manquants.length;
                this.statDocumentsEntreprise = {
                    fournis, total: obligatoires.length,
                    pourcentage: obligatoires.length === 0 ? 100 : Math.round((fournis / obligatoires.length) * 100)
                };

                const aTraiter: Array<{ libelle: string; sousTitre: string; severite: 'warn' | 'danger' }> = [];
                manquants.forEach((t) => aTraiter.push({ libelle: t.libelle, sousTitre: 'Document manquant', severite: 'danger' }));
                let nbExpirant = 0;
                typesPourEntreprise.forEach((t) => {
                    const doc = documentsByType[t.id];
                    const jours = doc?.statutValidation === 'VALIDE' ? this.joursAvantExpiration(doc.dateExpiration) : null;
                    if (jours !== null && jours >= 0 && jours <= 30) {
                        nbExpirant++;
                        aTraiter.push({
                            libelle: t.libelle,
                            sousTitre: jours === 0 ? "Expire aujourd'hui" : `Expire dans ${jours} jour(s)`,
                            severite: 'warn'
                        });
                    }
                });
                this.nbDocumentsExpirantBientot = nbExpirant;
                this.documentsATraiter = aTraiter.slice(0, 6);

                this.mesChantiersActifs = chantiers
                    .filter((c) => c.statut === 'ACTIF')
                    .map((c) => ({ nom: c.nom, nomClient: clients.find((cl) => cl.id === c.clientId)?.raisonSociale ?? '—' }));

                this.statChantiers = this.calculerEtat(chantiers, (c) => c.statut === 'ACTIF');
                this.statSalaries = this.calculerEtat(salaries, (s) => s.statut === 'ACTIF');
                this.statSalariesChantier = {
                    surChantier: salaries.filter((s) => !!s.chantierActuel).length,
                    disponibles: salaries.filter((s) => !s.chantierActuel).length
                };

                const libellesAction: Record<string, string> = {
                    CREATION: 'déposé', VALIDATION: 'validé', REFUS: 'refusé', SUPPRESSION: 'supprimé'
                };
                this.activiteRecente = historique.slice(0, 6).map((h) => ({
                    date: h.createdAt,
                    texte: `${(h.details?.['typeDocumentLibelle'] as string) ?? 'Document'} — ${libellesAction[h.action] ?? h.action}`
                }));

                this.chargement = false;
            },
            error: () => (this.chargement = false)
        });
    }

    /**
     * Dashboard Client : une vue d'ensemble rassurante plutôt qu'un registre à
     * dépouiller — l'inverse du dashboard standard (parc/graphiques) qui s'adresse à
     * un opérateur interne. Chantiers/entreprises/salariés/contrôles proviennent tous
     * d'endpoints déjà scopés côté backend (voir estClient ci-dessus) : aucun filtrage
     * de périmètre n'est refait ici, qu'il s'agisse d'un compte "accès total" ou
     * "responsable de chantier".
     */
    private chargerDashboardClient(): void {
        forkJoin({
            clients: this.clientService.lister(),
            chantiers: this.chantierService.lister(),
            entreprises: this.entrepriseService.lister(),
            salaries: this.salarieService.lister(),
            controles: this.controleService.lister()
        }).subscribe({
            next: ({ clients, chantiers, entreprises, salaries, controles }) => {
                this.nomClient = clients[0]?.raisonSociale ?? '';

                this.statChantiers = this.calculerEtat(chantiers, (c) => c.statut === 'ACTIF');
                this.nbEntreprisesIntervenantes = entreprises.length;
                // rangActuel peut cumuler plusieurs rôles ("PRINCIPALE, STT1") si l'entreprise
                // intervient à des rangs différents selon le chantier — comptée comme
                // "principale" dès qu'elle l'est au moins une fois, sinon sous-traitante.
                this.nbEntreprisesPrincipales = entreprises.filter((e) => (e.rangActuel ?? '').includes('PRINCIPALE')).length;
                this.nbEntreprisesSousTraitantes = this.nbEntreprisesIntervenantes - this.nbEntreprisesPrincipales;
                this.nbSalariesSurChantiers = salaries.length;
                this.statControles = this.calculerEtat(controles, (c) => c.termine);
                this.chargerRepartitionSalariesClient(chantiers.map((c) => c.id));

                const aujourdHui = new Date();
                const nbControlesEnRetard = controles.filter(
                    (c) => !c.termine && new Date(c.dateControle) < aujourdHui
                ).length;
                this.banniereClientOk = nbControlesEnRetard === 0;

                const prochainControle = controles
                    .filter((c) => !c.termine && new Date(c.dateControle) >= aujourdHui)
                    .sort((a, b) => new Date(a.dateControle).getTime() - new Date(b.dateControle).getTime())[0];
                const chantierNomParIdPourControle: Record<string, string> = {};
                chantiers.forEach((c) => (chantierNomParIdPourControle[c.id] = c.nom));
                if (nbControlesEnRetard > 0) {
                    this.prochainControleOk = false;
                    this.prochainControleTexte = `${nbControlesEnRetard} contrôle(s) en retard`;
                } else if (prochainControle) {
                    const jours = Math.round((new Date(prochainControle.dateControle).getTime() - aujourdHui.getTime()) / 86400000);
                    this.prochainControleOk = true;
                    this.prochainControleTexte = `Prochain contrôle dans ${jours} jour(s) — ${chantierNomParIdPourControle[prochainControle.chantierId] ?? ''}`;
                } else {
                    this.prochainControleOk = true;
                    this.prochainControleTexte = 'Aucun contrôle à venir programmé';
                }
                this.banniereClientTexte = this.banniereClientOk
                    ? 'Tous vos chantiers actifs ont un contrôle à jour — rien ne nécessite votre attention.'
                    : `${nbControlesEnRetard} contrôle(s) auraient dû être réalisés — contactez votre organisme de contrôle si besoin.`;

                this.mesChantiersClient = chantiers
                    .filter((c) => c.statut === 'ACTIF')
                    .map((c) => ({ id: c.id, nom: c.nom, ville: c.ville, statut: c.statut }));

                this.entreprisesSurMesChantiers = entreprises.slice(0, 6).map((e) => ({
                    id: e.id, raisonSociale: e.raisonSociale, chantierActuel: e.chantierActuel, rangActuel: e.rangActuel
                }));

                const chantierNomParId: Record<string, string> = {};
                chantiers.forEach((c) => (chantierNomParId[c.id] = c.nom));
                this.derniersControlesClient = controles
                    .slice()
                    .sort((a, b) => new Date(b.dateControle).getTime() - new Date(a.dateControle).getTime())
                    .slice(0, 5)
                    .map((c) => ({
                        chantierNom: chantierNomParId[c.chantierId] ?? '—',
                        date: c.dateControle,
                        termine: c.termine
                    }));

                this.chargement = false;
            },
            error: () => (this.chargement = false)
        });
    }

    /** Postes occupés (une affectation par chantier, PAS dédupliqué comme salaries.length
        ci-dessus) et statut d'accès — sert à clarifier "1 personne" quand elle est en
        réalité déployée sur plusieurs chantiers, plutôt qu'un chiffre brut ambigu. Aucun
        endpoint ne renvoie ça en un seul appel : un aller par chantier accessible, déjà
        scopé côté backend (voir AffectationSalarieChantierController). */
    private chargerRepartitionSalariesClient(chantierIds: string[]): void {
        if (chantierIds.length === 0) {
            this.nbPostesSalariesClient = 0;
            this.statutAccesSalariesClient = { accorde: 0, enAttente: 0, refuse: 0 };
            return;
        }
        forkJoin(chantierIds.map((id) => this.affectationSalarieService.lister(id))).subscribe({
            next: (listesParChantier) => {
                const affectations = listesParChantier.flat();
                this.nbPostesSalariesClient = affectations.length;
                this.statutAccesSalariesClient = {
                    accorde: affectations.filter((a) => a.statutAcces === 'ACCORDE').length,
                    enAttente: affectations.filter((a) => a.statutAcces === 'EN_ATTENTE').length,
                    refuse: affectations.filter((a) => a.statutAcces === 'REFUSE').length
                };
            }
        });
    }

    private joursAvantExpiration(dateExpiration?: string | null): number | null {
        if (!dateExpiration) {
            return null;
        }
        const aujourdHui = new Date();
        aujourdHui.setHours(0, 0, 0, 0);
        const expiration = new Date(dateExpiration);
        expiration.setHours(0, 0, 0, 0);
        return Math.round((expiration.getTime() - aujourdHui.getTime()) / (1000 * 60 * 60 * 24));
    }

    private calculerEtat<T>(items: T[], estActif: (item: T) => boolean): EtatEntite {
        const actifs = items.filter(estActif).length;
        return { total: items.length, actifs, inactifs: items.length - actifs };
    }
}
