export interface Client {
    id: string;
    raisonSociale: string;
    adresse?: string;
    adresse2?: string;
    adresse3?: string;
    ville?: string;
    paysId?: string;
    telephone?: string;
    telephone2?: string;
    telephone3?: string;
    email?: string;
    siren?: string;
    siret?: string;
    rcsRci?: string;
    tvaIntra?: string;
    numCotisant?: string;
    responsableSignataireAgrement?: string;
    actif: boolean;
    createdAt: string;
}

export interface CreateClientRequest {
    raisonSociale: string;
    adresse?: string;
    adresse2?: string;
    adresse3?: string;
    ville?: string;
    paysId?: string;
    telephone?: string;
    telephone2?: string;
    telephone3?: string;
    email?: string;
    siren?: string;
    siret?: string;
    rcsRci?: string;
    tvaIntra?: string;
    numCotisant?: string;
    responsableSignataireAgrement?: string;
}
