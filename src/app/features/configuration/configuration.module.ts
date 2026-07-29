import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TabViewModule } from 'primeng/tabview';
import { MultiSelectModule } from 'primeng/multiselect';

import { SharedModule } from '../../shared/shared.module';
import { ConfigurationRoutingModule } from './configuration-routing.module';
import { ConfigurationComponent } from './configuration.component';
import { PaysFormDialogComponent } from './pays-form-dialog/pays-form-dialog.component';
import { CorpsDeMetierFormDialogComponent } from './corps-de-metier-form-dialog/corps-de-metier-form-dialog.component';
import { TypeSalarieFormDialogComponent } from './type-salarie-form-dialog/type-salarie-form-dialog.component';
import { TypeContratSalarieFormDialogComponent } from './type-contrat-salarie-form-dialog/type-contrat-salarie-form-dialog.component';
import { SalarieFonctionFormDialogComponent } from './salarie-fonction-form-dialog/salarie-fonction-form-dialog.component';
import { ControleTiersFormDialogComponent } from './controle-tiers-form-dialog/controle-tiers-form-dialog.component';
import { UtilisateurFormPageComponent } from './utilisateur-form-page/utilisateur-form-page.component';

@NgModule({
    declarations: [
        ConfigurationComponent,
        PaysFormDialogComponent,
        CorpsDeMetierFormDialogComponent,
        TypeSalarieFormDialogComponent,
        TypeContratSalarieFormDialogComponent,
        SalarieFonctionFormDialogComponent,
        ControleTiersFormDialogComponent,
        UtilisateurFormPageComponent
    ],
    imports: [SharedModule, ConfigurationRoutingModule, FormsModule, TabViewModule, MultiSelectModule, RouterModule]
})
export class ConfigurationModule { }
