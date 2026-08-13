import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ChantierService } from '../chantiers/services/chantier.service';
import { ClientService } from '../clients/services/client.service';
import { EntrepriseService } from '../entreprises/services/entreprise.service';
import { SalarieService } from '../salaries/services/salarie.service';
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

    constructor(
        private chantierService: ChantierService,
        private clientService: ClientService,
        private entrepriseService: EntrepriseService,
        private salarieService: SalarieService,
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
