import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextareaModule } from 'primeng/inputtextarea';

import { SharedModule } from '../../shared/shared.module';
import { ChantiersRoutingModule } from './chantiers-routing.module';
import { ChantierListComponent } from './chantier-list/chantier-list.component';
import { ChantierDetailComponent } from './chantier-detail/chantier-detail.component';

@NgModule({
    declarations: [
        ChantierListComponent,
        ChantierDetailComponent
    ],
    imports: [SharedModule, ChantiersRoutingModule, FormsModule, RouterModule, TooltipModule, CheckboxModule, InputTextareaModule]
})
export class ChantiersModule { }
