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
    chantierId: string;
    affectationEntrepriseChantierId: string;
    entrepriseId?: string;
    dateDebut: string;
    dateFin?: string;
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
