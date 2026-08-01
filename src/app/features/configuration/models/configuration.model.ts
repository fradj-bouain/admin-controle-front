export interface Pays {
    id: string;
    codeIso: string;
    nom: string;
    zone?: string;
}

export interface CreatePaysRequest {
    codeIso: string;
    nom: string;
    zone?: string;
}

export interface CorpsDeMetier {
    id: string;
    libelle: string;
}

export interface CreateCorpsDeMetierRequest {
    libelle: string;
}

export interface TypeSalarie {
    id: string;
    code: string;
    libelle: string;
}

export interface CreateTypeSalarieRequest {
    code: string;
    libelle: string;
}

export interface TypeContratSalarie {
    id: string;
    code: string;
    libelle: string;
}

export interface CreateTypeContratSalarieRequest {
    code: string;
    libelle: string;
}

export interface SalarieFonction {
    id: string;
    libelle: string;
}

export interface CreateSalarieFonctionRequest {
    libelle: string;
}

export interface ControleTiers {
    id: string;
    nom: string;
}

export interface CreateControleTiersRequest {
    nom: string;
}

export type CibleActionCorrective = 'SALARIES' | 'ENTREPRISES' | 'SALARIES_ET_ENTREPRISES';

export interface ActionCorrective {
    id: string;
    nom: string;
    cible: CibleActionCorrective;
}

export interface CreateActionCorrectiveRequest {
    nom: string;
    cible: CibleActionCorrective;
}

export interface Utilisateur {
    id: string;
    username: string;
    civilite?: string;
    nom: string;
    prenom: string;
    email: string;
    roles: string[];
    entrepriseId?: string;
    clientId?: string;
    controleTiersId?: string;
    actif: boolean;
}

export interface CreateUtilisateurRequest {
    username: string;
    password: string;
    civilite?: string;
    nom: string;
    prenom: string;
    email: string;
    roles: string[];
    entrepriseId?: string;
    clientId?: string;
    controleTiersId?: string;
}
