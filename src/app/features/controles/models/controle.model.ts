export interface Controle {
    id: string;
    chantierId: string;
    controleurUtilisateurId: string;
    dateControle: string;
    remarques?: string;
    controleTiersId?: string;
    dateFin?: string;
    termine: boolean;
}

export interface CreateControleRequest {
    chantierId: string;
    dateControle: string;
    remarques?: string;
    controleTiersId?: string;
    dateFin?: string;
    termine: boolean;
}

export interface ModifierControleRequest {
    dateControle: string;
    remarques?: string;
    controleTiersId?: string;
    dateFin?: string;
    termine: boolean;
}

export interface ControleSalarie {
    id: string;
    controleId: string;
    salarieId: string;
    entrepriseId: string;
    accorde: boolean;
    actionCorrectiveId?: string;
    createdAt: string;
}

export interface AjouterControleSalarieRequest {
    salarieId: string;
    entrepriseId: string;
    accorde: boolean;
    actionCorrectiveId?: string;
}

export interface ModifierControleSalarieRequest {
    accorde: boolean;
    actionCorrectiveId?: string;
}

export interface RapportControle {
    id: string;
    controleId: string;
    chantierId: string;
    nbSalariesControles: number;
    nbAccords: number;
    nbRefus: number;
    nbNouvellesEntreprises: number;
    nbNouveauxSalaries: number;
    nbEntreprises: number;
    nbSalariesDetaches: number;
    responsableUtilisateurId?: string;
    dateEnvoi?: string;
}

export interface CreateRapportRequest {
    controleId: string;
    nbNouvellesEntreprises: number;
    nbNouveauxSalaries: number;
    nbSalariesDetaches: number;
    responsableUtilisateurId?: string;
}

export interface ModifierRapportRequest {
    nbNouvellesEntreprises: number;
    nbNouveauxSalaries: number;
    nbSalariesDetaches: number;
    responsableUtilisateurId?: string;
}
