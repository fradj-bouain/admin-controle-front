export type StatutChantier = 'ACTIF' | 'INACTIF';
export type RecurrenceControles = 'AUCUNE' | 'HEBDOMADAIRE' | 'MENSUEL' | 'TRIMESTRIEL' | 'ANNUEL';

export interface Chantier {
    id: string;
    nom: string;
    clientId: string;
    prestation?: string;
    adresse?: string;
    adresse2?: string;
    adresse3?: string;
    ville?: string;
    paysId?: string;
    chefChantierUtilisateurId?: string;
    salarieResponsableId?: string;
    ipsAllowed?: string;
    dateDebut?: string;
    dateFinPrevue?: string;
    statut: StatutChantier;
    recurrenceControles?: RecurrenceControles;
    dateProchainControle?: string;
    createdAt: string;
}

export interface CreateChantierRequest {
    nom: string;
    clientId: string;
    prestation?: string;
    adresse?: string;
    adresse2?: string;
    adresse3?: string;
    ville?: string;
    paysId?: string;
    ipsAllowed?: string;
    dateDebut?: string;
    dateFinPrevue?: string;
}

export interface DefinirControlesRequest {
    recurrenceControles?: RecurrenceControles;
    dateProchainControle?: string;
}

export interface ChantierUtilisateur {
    chantierId: string;
    utilisateurId: string;
    createdAt: string;
}
