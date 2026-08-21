import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ConformitePortefeuille, CreateDocumentRequest, DocumentEnAttente, DocumentExpirant, DocumentItem, HistoriqueModification } from '../models/document.model';
import { MessagePlanifie } from 'src/app/features/messagerie/models/message.model';

@Injectable({ providedIn: 'root' })
export class DocumentService {

    private readonly baseUrl = `${environment.apiUrl}/documents`;

    constructor(private http: HttpClient) { }

    listerParSalarie(salarieId: string): Observable<DocumentItem[]> {
        return this.http.get<DocumentItem[]>(this.baseUrl, { params: { salarieId } });
    }

    /** Les documents d'un salarié propres à UN chantier précis — instance indépendante de
        ses documents globaux (chantierId absent) et de ses autres chantiers : valider/
        refuser/supprimer une ligne obtenue ainsi ne touche jamais un autre chantier. */
    listerParSalarieEtChantier(salarieId: string, chantierId: string): Observable<DocumentItem[]> {
        return this.http.get<DocumentItem[]>(this.baseUrl, { params: { salarieId, chantierId } });
    }

    listerParEntreprise(entrepriseId: string): Observable<DocumentItem[]> {
        return this.http.get<DocumentItem[]>(this.baseUrl, { params: { entrepriseId } });
    }

    /** Les documents d'une entreprise propres à UN chantier précis — instance indépendante
        de ses documents globaux (chantierId absent) et de ses autres chantiers : valider/
        refuser/supprimer une ligne obtenue ainsi ne touche jamais un autre chantier. */
    listerParEntrepriseEtChantier(entrepriseId: string, chantierId: string): Observable<DocumentItem[]> {
        return this.http.get<DocumentItem[]>(this.baseUrl, { params: { entrepriseId, chantierId } });
    }

    creer(request: CreateDocumentRequest, fichier?: File | null): Observable<DocumentItem> {
        const formData = new FormData();
        formData.append('document', new Blob([JSON.stringify(request)], { type: 'application/json' }));
        if (fichier) {
            formData.append('fichier', fichier, fichier.name);
        }
        return this.http.post<DocumentItem>(this.baseUrl, formData);
    }

    /** Contenu binaire pour aperçu inline (iframe/img) — passe par un Blob car la route est authentifiée. */
    apercuBlob(id: string): Observable<Blob> {
        return this.http.get(`${this.baseUrl}/${id}/fichier`, { responseType: 'blob' });
    }

    telechargerBlob(id: string): Observable<Blob> {
        return this.http.get(`${this.baseUrl}/${id}/fichier`, { params: { telecharger: 'true' }, responseType: 'blob' });
    }

    valider(id: string, dates?: { dateDebutValidite?: string; dateExpiration?: string }): Observable<DocumentItem> {
        return this.http.post<DocumentItem>(`${this.baseUrl}/${id}/valider`, dates ?? {});
    }

    refuser(id: string, documentEtatId: string): Observable<DocumentItem> {
        return this.http.post<DocumentItem>(`${this.baseUrl}/${id}/refuser`, { documentEtatId });
    }

    notifier(id: string, request: { email: string; sujet: string; description: string }): Observable<void> {
        return this.http.post<void>(`${this.baseUrl}/${id}/notifier`, request);
    }

    supprimer(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/${id}`);
    }

    // chantierId : même principe que listerParEntrepriseEtChantier/listerParSalarieEtChantier
    // — un chantier ne doit voir que l'historique/les relances de SES propres documents,
    // pas ceux des autres chantiers du même salarié/de la même entreprise. Absent = tous
    // chantiers confondus, comportement inchangé (ex: vue globale de la fiche).
    historiqueParSalarie(salarieId: string, chantierId?: string): Observable<HistoriqueModification[]> {
        return this.http.get<HistoriqueModification[]>(`${this.baseUrl}/historique`,
            { params: chantierId ? { salarieId, chantierId } : { salarieId } });
    }

    historiqueParEntreprise(entrepriseId: string, chantierId?: string): Observable<HistoriqueModification[]> {
        return this.http.get<HistoriqueModification[]>(`${this.baseUrl}/historique`,
            { params: chantierId ? { entrepriseId, chantierId } : { entrepriseId } });
    }

    relancesParSalarie(salarieId: string, chantierId?: string): Observable<MessagePlanifie[]> {
        return this.http.get<MessagePlanifie[]>(`${this.baseUrl}/relances`,
            { params: chantierId ? { salarieId, chantierId } : { salarieId } });
    }

    relancesParEntreprise(entrepriseId: string, chantierId?: string): Observable<MessagePlanifie[]> {
        return this.http.get<MessagePlanifie[]>(`${this.baseUrl}/relances`,
            { params: chantierId ? { entrepriseId, chantierId } : { entrepriseId } });
    }

    listerEnAttente(): Observable<DocumentEnAttente[]> {
        return this.http.get<DocumentEnAttente[]>(`${this.baseUrl}/en-attente`);
    }

    listerExpirantBientot(jours = 30): Observable<DocumentExpirant[]> {
        return this.http.get<DocumentExpirant[]>(`${this.baseUrl}/expirant-bientot`, { params: { jours: `${jours}` } });
    }

    conformiteEntreprises(): Observable<ConformitePortefeuille> {
        return this.http.get<ConformitePortefeuille>(`${this.baseUrl}/conformite-entreprises`);
    }
}
