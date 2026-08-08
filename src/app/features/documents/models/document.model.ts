export type CibleDocument = 'SALARIE' | 'ENTREPRISE';
export type FormatDocument = 'PDF' | 'WORD';
export type StatutValidation = 'EN_ATTENTE' | 'VALIDE' | 'REFUSE' | 'EXPIRE';

export interface TypeDocument {
    id: string;
    libelle: string;
    cible: CibleDocument;
    obligatoire: boolean;
    format: FormatDocument;
    corpsDeMetierId?: string;
    paysId?: string;
    /** Zone de pays ciblée (FRANCE/UE/HORS_UE, mêmes valeurs que Pays.zone) — évaluée
        contre la zone du pays de nationalité, en complément de paysId (un pays précis).
        Ex : Titre de séjour obligatoire pour tout salarié Hors UE. */
    zoneRequise?: string;
    dateDebutValiditeRequise: boolean;
    dateFinValiditeRequise: boolean;
    nbJoursRelanceAvant: number;
    nbJoursRecurrence: number;
    retireAccordAcces: boolean;
}

export interface CreateTypeDocumentRequest {
    libelle: string;
    cible: CibleDocument;
    obligatoire: boolean;
    format: FormatDocument;
    corpsDeMetierId?: string;
    paysId?: string;
    zoneRequise?: string;
    dateDebutValiditeRequise?: boolean;
    dateFinValiditeRequise?: boolean;
    nbJoursRelanceAvant?: number;
    nbJoursRecurrence?: number;
    retireAccordAcces?: boolean;
}

export interface DocumentItem {
    id: string;
    typeDocumentId: string;
    salarieId?: string;
    entrepriseId?: string;
    chantierId?: string;
    fichierUrl?: string;
    /** Nom du fichier tel que déposé — présent uniquement si un fichier a réellement été envoyé (voir GET /{id}/fichier). */
    nomFichierOriginal?: string;
    typeMime?: string;
    tailleOctets?: number;
    dateDebutValidite?: string;
    dateExpiration?: string;
    dateRelance?: string;
    mentions?: string;
    statutValidation: StatutValidation;
    documentEtatId?: string;
}

export interface DocumentEtat {
    id: string;
    titre: string;
    parDefaut: boolean;
    dateExpiree: boolean;
    valideLeDocument: boolean;
}

export interface CreateDocumentEtatRequest {
    titre: string;
    parDefaut: boolean;
    dateExpiree: boolean;
    valideLeDocument: boolean;
}

export interface CreateDocumentRequest {
    typeDocumentId: string;
    salarieId?: string;
    entrepriseId?: string;
    chantierId?: string;
    fichierUrl?: string;
    dateDebutValidite?: string;
    dateExpiration?: string;
    dateRelance?: string;
    mentions?: string;
}

export interface HistoriqueModification {
    id: string;
    entite: string;
    entiteId: string;
    action: string;
    details: Record<string, unknown>;
    utilisateurId?: string;
    createdAt: string;
}

export interface DocumentEnAttente {
    documentId: string;
    typeLibelle: string;
    salarieId?: string;
    salarieNom?: string;
    entrepriseId?: string;
    entrepriseNom?: string;
    createdAt: string;
}
