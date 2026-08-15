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
    // Uniquement pertinent pour un compte CLIENT : nombre de chantiers auxquels il a
    // été explicitement assigné. 0 = aucun accès du tout (règle stricte, pas de repli
    // "voit tout par défaut") — voir l'indicateur affiché sur "Mon équipe" / la liste
    // des utilisateurs, et ScopeAuthorizationService côté backend.
    nbChantiersAssignes?: number;
    // Uniquement pertinent pour un compte CLIENT : true = voit tous les chantiers du
    // client (et tout ce qui en dépend), false = "responsable de chantier" cantonné à
    // nbChantiersAssignes. Modifiable uniquement par un SUPER_ADMIN.
    accesTousChantiers?: boolean;
}

// Détail "équipe" (vue Client "accès total") : un chantier auquel ce compte a été
// explicitement assigné, avec quand (depuisLe) et où (ville) — voir GET /utilisateurs/{id}/chantiers.
export interface UtilisateurChantier {
    chantierId: string;
    nom: string;
    ville?: string;
    statut: string;
    depuisLe: string;
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
    // Ignoré par le backend hors création par un SUPER_ADMIN (voir UtilisateurController) :
    // un compte Client ne peut jamais s'auto-attribuer l'accès total via Mon équipe.
    accesTousChantiers?: boolean;
}

export interface ModifierUtilisateurRequest {
    nom: string;
    prenom: string;
    email: string;
    username: string;
    // Vide/absent = mot de passe inchangé (voir UtilisateurService.modifier côté backend).
    password?: string;
    // Idem CreateUtilisateurRequest : ignoré hors édition par un SUPER_ADMIN.
    accesTousChantiers?: boolean;
}
