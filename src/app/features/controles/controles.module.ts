import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TabViewModule } from 'primeng/tabview';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';

import { SharedModule } from '../../shared/shared.module';
import { ControlesRoutingModule } from './controles-routing.module';
import { ControleListComponent } from './controle-list/controle-list.component';
import { ControleFormPageComponent } from './controle-form-page/controle-form-page.component';
import { RapportFormPageComponent } from './rapport-form-page/rapport-form-page.component';

@NgModule({
    declarations: [ControleListComponent, ControleFormPageComponent, RapportFormPageComponent],
    imports: [SharedModule, ControlesRoutingModule, FormsModule, TabViewModule, InputTextareaModule, InputNumberModule, CheckboxModule, RouterModule]
})
export class ControlesModule { }
