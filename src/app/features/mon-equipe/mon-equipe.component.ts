import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService } from 'src/app/core/auth/auth.service';
import { Utilisateur } from '../configuration/models/configuration.model';
import { UtilisateurService } from '../configuration/services/utilisateur.service';

/**
 * Auto-gestion des comptes rattachés à SA PROPRE session (Client ou Entreprise) :
 * le rôle et le rattachement (clientId/entrepriseId) ne sont jamais choisis ici,
 * le backend les force à ceux de l'appelant quoi que contienne la requête — le
 * champ `roles` envoyé n'a donc pas besoin d'être exact, juste non vide (validation).
 */
@Component({
    selector: 'app-mon-equipe',
    templateUrl: './mon-equipe.component.html',
    providers: [MessageService, ConfirmationService]
})
export class MonEquipeComponent implements OnInit {

    // identiteCalculee ajouté au chargement, pour permettre un p-columnFilter texte
    // simple sur la colonne Utilisateur (nom + prénom + username regroupés).
    utilisateurs: Array<Utilisateur & { identiteCalculee: string }> = [];
    dialogVisible = false;
    saving = false;
    // Non-null = la popup édite ce compte plutôt que d'en créer un nouveau (même
    // formulaire réutilisé, voir ouvrirCreation/ouvrirEdition/submit).
    utilisateurEnEdition: Utilisateur | null = null;

    form = this.fb.group({
        nom: ['', Validators.required],
        prenom: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        username: ['', Validators.required],
        password: ['', Validators.required]
    });

    constructor(
        private fb: FormBuilder,
        private utilisateurService: UtilisateurService,
        private auth: AuthService,
        private message: MessageService,
        private confirmation: ConfirmationService
    ) { }

    ngOnInit(): void {
        this.charger();
    }

    // La restriction d'accès chantier (voir ScopeAuthorizationService) ne concerne
    // que les comptes CLIENT — inutile d'afficher cette colonne pour une équipe
    // Entreprise, où elle n'a pas de sens.
    get estClient(): boolean {
        return this.auth.hasRole('CLIENT');
    }

    charger() {
        this.utilisateurService.lister().subscribe((utilisateurs) => {
            this.utilisateurs = utilisateurs.map((u) => ({ ...u, identiteCalculee: `${u.nom} ${u.prenom} (${u.username})` }));
        });
    }

    ouvrirCreation() {
        this.utilisateurEnEdition = null;
        this.form.reset();
        this.form.controls.password.setValidators(Validators.required);
        this.form.controls.password.updateValueAndValidity();
        this.dialogVisible = true;
    }

    /** Mot de passe volontairement laissé vide : le backend garde l'ancien si ce champ
        n'est pas rempli (voir UtilisateurService.modifier), pas la peine de le redemander
        pour une simple correction du nom/email. */
    ouvrirEdition(utilisateur: Utilisateur) {
        this.utilisateurEnEdition = utilisateur;
        this.form.reset({
            nom: utilisateur.nom,
            prenom: utilisateur.prenom,
            email: utilisateur.email,
            username: utilisateur.username,
            password: ''
        });
        this.form.controls.password.clearValidators();
        this.form.controls.password.updateValueAndValidity();
        this.dialogVisible = true;
    }

    submit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this.form.getRawValue();
        this.saving = true;

        if (this.utilisateurEnEdition) {
            this.utilisateurService.modifier(this.utilisateurEnEdition.id, {
                nom: value.nom!,
                prenom: value.prenom!,
                email: value.email!,
                username: value.username!,
                password: value.password || undefined
            }).subscribe({
                next: () => {
                    this.saving = false;
                    this.dialogVisible = false;
                    this.message.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur modifié' });
                    this.charger();
                },
                error: (err) => {
                    this.saving = false;
                    this.message.add({ severity: 'error', summary: 'Erreur', detail: err?.error?.message ?? 'Modification impossible' });
                }
            });
            return;
        }

        const monPropreRole = this.auth.hasRole('CLIENT') ? 'CLIENT' : 'ENTREPRISE';
        this.utilisateurService.creer({
            nom: value.nom!,
            prenom: value.prenom!,
            email: value.email!,
            username: value.username!,
            password: value.password!,
            roles: [monPropreRole]
        }).subscribe({
            next: () => {
                this.saving = false;
                this.dialogVisible = false;
                this.message.add({ severity: 'success', summary: 'Succès', detail: 'Utilisateur créé' });
                this.charger();
            },
            error: () => {
                this.saving = false;
                this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Création impossible' });
            }
        });
    }

    confirmerBasculeStatut(utilisateur: Utilisateur) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: 'Voulez-vous ' + (utilisateur.actif ? 'désactiver' : 'activer') + ' cet utilisateur ?',
            accept: () => {
                const obs = utilisateur.actif
                    ? this.utilisateurService.desactiver(utilisateur.id)
                    : this.utilisateurService.activer(utilisateur.id);
                obs.subscribe({
                    next: () => this.charger(),
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Action impossible' })
                });
            }
        });
    }

    confirmerSuppression(utilisateur: Utilisateur) {
        this.confirmation.confirm({
            header: 'Confirmation',
            message: `Voulez-vous supprimer "${utilisateur.username}" ?`,
            acceptButtonStyleClass: 'p-button-danger',
            accept: () => {
                this.utilisateurService.supprimer(utilisateur.id).subscribe({
                    next: () => {
                        this.message.add({ severity: 'success', summary: 'Succès', detail: 'Supprimé' });
                        this.charger();
                    },
                    error: () => this.message.add({ severity: 'error', summary: 'Erreur', detail: 'Suppression impossible' })
                });
            }
        });
    }
}
