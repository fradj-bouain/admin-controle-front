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

export interface RapportControle {
    id: string;
    controleId: string;
    nbSalariesControles: number;
    nbAccords: number;
    nbRefus: number;
    nbNouvellesEntreprises: number;
    nbNouveauxSalaries: number;
    nbSalariesDetaches: number;
    responsableUtilisateurId?: string;
    dateEnvoi?: string;
}

export interface CreateRapportRequest {
    controleId: string;
    nbSalariesControles: number;
    nbAccords: number;
    nbRefus: number;
    nbNouvellesEntreprises: number;
    nbNouveauxSalaries: number;
    nbSalariesDetaches: number;
    responsableUtilisateurId?: string;
}
