export type DestinataireType = 'CLIENT' | 'ENTREPRISE' | 'UTILISATEUR';

export interface Message {
    id: string;
    expediteurUtilisateurId: string;
    destinataireType: DestinataireType;
    destinataireId: string;
    sujet: string;
    contenu: string;
    lu: boolean;
    createdAt: string;
}

export interface SendMessageRequest {
    destinataireType: DestinataireType;
    destinataireId: string;
    sujet: string;
    contenu: string;
}
