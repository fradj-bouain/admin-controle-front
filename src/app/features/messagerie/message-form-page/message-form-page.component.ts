import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService as ToastService } from 'primeng/api';
import { forkJoin } from 'rxjs';
import { SendMessageRequest } from '../models/message.model';
import { MessageService } from '../services/message.service';
import { Client } from 'src/app/features/clients/models/client.model';
import { ClientService } from 'src/app/features/clients/services/client.service';
import { Entreprise } from 'src/app/features/entreprises/models/entreprise.model';
import { EntrepriseService } from 'src/app/features/entreprises/services/entreprise.service';
import { UtilisateurService } from 'src/app/features/configuration/services/utilisateur.service';
import { Utilisateur } from 'src/app/features/configuration/models/configuration.model';
import { Chantier } from 'src/app/features/chantiers/models/chantier.model';
import { ChantierService } from 'src/app/features/chantiers/services/chantier.service';

@Component({
    selector: 'app-message-form-page',
    templateUrl: './message-form-page.component.html',
    providers: [ToastService]
})
export class MessageFormPageComponent implements OnInit {

    saving = false;

    chantiers: Chantier[] = [];
    clients: Client[] = [];
    entreprises: Entreprise[] = [];
    utilisateurs: Utilisateur[] = [];

    chantiersOptions: Array<{ id: string; label: string }> = [];

    // Un seul champ groupé par type au lieu de trois sélecteurs côte à côte qui se
    // ressemblaient trop (voir audit UX — le texte "Tous ? / Aucun ?" trahissait
    // l'ambiguïté). Chaque valeur encode son type ("TYPE:id"), décodé à l'envoi.
    destinatairesOptions: Array<{ label: string; items: Array<{ label: string; value: string }> }> = [];

    form = this.fb.group({
        chantierId: [''],
        destinataires: [[] as string[]],
        copieAdmin: [false],
        sujet: ['', Validators.required],
        contenu: [this.modeleParDefaut(), Validators.required]
    });

    constructor(
        private fb: FormBuilder,
        private messageService: MessageService,
        private clientService: ClientService,
        private entrepriseService: EntrepriseService,
        private utilisateurService: UtilisateurService,
        private chantierService: ChantierService,
        private router: Router,
        private toast: ToastService
    ) { }

    ngOnInit(): void {
        this.chantierService.lister().subscribe((chantiers) => {
            this.chantiers = chantiers;
            this.chantiersOptions = chantiers.map((c) => ({ id: c.id, label: c.nom }));
        });
        this.clientService.lister().subscribe((clients) => {
            this.clients = clients;
            this.recalculerDestinatairesOptions();
        });
        this.entrepriseService.lister().subscribe((entreprises) => {
            this.entreprises = entreprises;
            this.recalculerDestinatairesOptions();
        });
        this.utilisateurService.lister().subscribe((utilisateurs) => {
            this.utilisateurs = utilisateurs;
            this.recalculerDestinatairesOptions();
        });
    }

    private recalculerDestinatairesOptions() {
        this.destinatairesOptions = [
            { label: 'Utilisateurs', items: this.utilisateurs.map((u) => ({ label: u.username, value: `UTILISATEUR:${u.id}` })) },
            { label: 'Clients', items: this.clients.map((c) => ({ label: c.raisonSociale, value: `CLIENT:${c.id}` })) },
            { label: 'Entreprises', items: this.entreprises.map((e) => ({ label: e.raisonSociale, value: `ENTREPRISE:${e.id}` })) }
        ];
    }

    annuler() {
        this.router.navigate(['/messagerie']);
    }

    // Parité d'affichage avec le modèle de courrier du site legacy (logo,
    // balises, bloc coordonnées) : contenu de départ éditable, pas une valeur
    // figée envoyée telle quelle — l'utilisateur le personnalise avant l'envoi.
    private modeleParDefaut(): string {
        return `
<p><img src="assets/layout/images/admincontrol-logo.png" alt="ADMIN-CONTROL'BTP" style="max-width:200px;" /></p>
<p>Date :<br /><strong>[DATE]</strong></p>
<p>Chantier :<br /><strong>[CHANTIER_NOM]</strong></p>
<p>Client :<br /><strong>[CLIENT_NOM]</strong></p>
<p>Entreprise concernée :<br /><strong>[ENTREPRISE_NOM]</strong></p>
<p><br /></p>
<p>Madame, Monsieur,</p>
<p><br /></p>
<p>Cordialement.</p>
<p>L'équipe ADMIN-CONTROL'BTP</p>
<p><br /></p>
<p>Service gestion et traitement centralisé : +33 (0)5 35 54 23 58<br />E-mail : suivi.chantier.control.btp@gmail.com</p>
<p>Réception des appels : du lundi au vendredi de 08h30 à 12h00</p>
`.trim();
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();

        // Un seul message ne peut viser qu'un type + un destinataire côté backend
        // (voir SendMessageRequest) : la sélection multi-catégories du site legacy
        // se traduit ici par un envoi par destinataire coché, dédupliqué.
        const cibles = new Map<string, SendMessageRequest>();
        const ajouter = (type: SendMessageRequest['destinataireType'], id: string) => {
            cibles.set(`${type}:${id}`, {
                chantierId: value.chantierId || undefined,
                destinataireType: type,
                destinataireId: id,
                sujet: value.sujet!,
                contenu: value.contenu!
            });
        };
        (value.destinataires ?? []).forEach((composite) => {
            const [type, id] = composite.split(':');
            ajouter(type as SendMessageRequest['destinataireType'], id);
        });
        if (value.copieAdmin) {
            this.utilisateurs
                .filter((u) => u.roles.includes('SUPER_ADMIN'))
                .forEach((u) => ajouter('UTILISATEUR', u.id));
        }

        if (cibles.size === 0) {
            this.toast.add({ severity: 'warn', summary: 'Destinataire requis', detail: 'Sélectionnez au moins un destinataire.' });
            return;
        }

        this.saving = true;
        const envois = Array.from(cibles.values()).map((requete) => this.messageService.envoyer(requete));
        forkJoin(envois).subscribe({
            next: () => this.router.navigate(['/messagerie']),
            error: () => {
                this.saving = false;
                this.toast.add({ severity: 'error', summary: 'Erreur', detail: 'Envoi impossible' });
            }
        });
    }
}
