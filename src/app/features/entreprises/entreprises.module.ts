import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';
import { SharedModule } from '../../shared/shared.module';
import { EntreprisesRoutingModule } from './entreprises-routing.module';
import { EntrepriseListComponent } from './entreprise-list/entreprise-list.component';
import { EntrepriseDetailComponent } from './entreprise-detail/entreprise-detail.component';

@NgModule({
    declarations: [EntrepriseListComponent, EntrepriseDetailComponent],
    imports: [SharedModule, EntreprisesRoutingModule, RouterModule, FormsModule, InputTextareaModule, CheckboxModule, TooltipModule]
})
export class EntreprisesModule { }
