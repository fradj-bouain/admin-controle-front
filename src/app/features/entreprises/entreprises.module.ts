import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { InputSwitchModule } from 'primeng/inputswitch';
import { PasswordModule } from 'primeng/password';
import { EditorModule } from 'primeng/editor';
import { SidebarModule } from 'primeng/sidebar';
import { SharedModule } from '../../shared/shared.module';
import { EntreprisesRoutingModule } from './entreprises-routing.module';
import { EntrepriseListComponent } from './entreprise-list/entreprise-list.component';
import { EntrepriseDetailComponent } from './entreprise-detail/entreprise-detail.component';

@NgModule({
    declarations: [EntrepriseListComponent, EntrepriseDetailComponent],
    imports: [SharedModule, EntreprisesRoutingModule, RouterModule, FormsModule, InputTextareaModule, CheckboxModule, TooltipModule, InputSwitchModule, PasswordModule, EditorModule, SidebarModule]
})
export class EntreprisesModule { }
