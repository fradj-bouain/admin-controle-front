export type StatutSalarie = 'ACTIF' | 'INACTIF';
export type StatutAcces = 'EN_ATTENTE' | 'ACCORDE' | 'REFUSE';

export interface Salarie {
    id: string;
    nom: string;
    prenom: string;
    dateNaissance?: string;
    nationalitePaysId?: string;
    entrepriseEmployeurId: string;
    typeSalarieId?: string;
    typeContratId?: string;
    fonctionId?: string;
    statut: StatutSalarie;
    // Nom du chantier sur lequel ce salarié est actuellement affecté (absent/null =
    // aucun, affiché "Disponible") — à ne pas confondre avec `statut` ci-dessus, un
    // simple interrupteur administratif sans lien avec une affectation réelle.
    chantierActuel?: string | null;
    createdAt: string;
}

export interface CreateSalarieRequest {
    nom: string;
    prenom: string;
    dateNaissance?: string;
    nationalitePaysId?: string;
    entrepriseEmployeurId: string;
    typeSalarieId?: string;
    typeContratId?: string;
    fonctionId?: string;
}

export interface AffectationSalarieChantier {
    id: string;
    salarieId: string;
    // Présents uniquement sur la liste transverse (GET /salaries/affectations), résolus
    // côté backend — absents ailleurs (déjà connus du contexte : fiche Salarié ou Chantier).
    nomSalarie?: string;
    chantierId: string;
    nomChantier?: string;
    affectationEntrepriseChantierId: string;
    entrepriseId?: string;
    nomEntreprise?: string;
    dateDebut: string;
    dateFin?: string;
    // Statut d'ENGAGEMENT ("travaille encore sur ce chantier ?"), distinct de statutAcces
    // ("son accès au site est-il en règle ?").
    statut: string;
    statutAcces: StatutAcces;
    epiGants: boolean;
    epiCasque: boolean;
    epiChaussures: boolean;
    badgeEdite: boolean;
    present: boolean;
}

export interface AffecterSalarieRequest {
    salarieId: string;
    affectationEntrepriseChantierId: string;
}

export interface MajSuiviAffectationRequest {
    epiGants: boolean;
    epiCasque: boolean;
    epiChaussures: boolean;
    badgeEdite: boolean;
    present: boolean;
}
