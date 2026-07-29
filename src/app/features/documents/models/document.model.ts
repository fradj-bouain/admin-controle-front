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
    dateDebutValidite?: string;
    dateExpiration?: string;
    dateRelance?: string;
    mentions?: string;
    statutValidation: StatutValidation;
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
