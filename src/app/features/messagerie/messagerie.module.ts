import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TabViewModule } from 'primeng/tabview';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { EditorModule } from 'primeng/editor';
import { MultiSelectModule } from 'primeng/multiselect';

import { SharedModule } from '../../shared/shared.module';
import { MessagerieRoutingModule } from './messagerie-routing.module';
import { MessageListComponent } from './message-list/message-list.component';
import { MessageFormPageComponent } from './message-form-page/message-form-page.component';
import { AutomatisationListComponent } from './automatisation-list/automatisation-list.component';
import { AutomatisationFormPageComponent } from './automatisation-form-page/automatisation-form-page.component';
import { PlanificationListComponent } from './planification-list/planification-list.component';
import { PlanificationFormPageComponent } from './planification-form-page/planification-form-page.component';
import { MessageDetailPageComponent } from './message-detail-page/message-detail-page.component';

@NgModule({
    declarations: [
        MessageListComponent,
        MessageFormPageComponent,
        AutomatisationListComponent,
        AutomatisationFormPageComponent,
        PlanificationListComponent,
        PlanificationFormPageComponent,
        MessageDetailPageComponent
    ],
    imports: [SharedModule, MessagerieRoutingModule, FormsModule, TabViewModule, InputTextareaModule, TooltipModule, CheckboxModule, EditorModule, MultiSelectModule, RouterModule]
})
export class MessagerieModule { }
