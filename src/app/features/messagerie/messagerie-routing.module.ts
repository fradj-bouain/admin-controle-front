import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MessageListComponent } from './message-list/message-list.component';
import { MessageFormPageComponent } from './message-form-page/message-form-page.component';
import { AutomatisationFormPageComponent } from './automatisation-form-page/automatisation-form-page.component';
import { PlanificationFormPageComponent } from './planification-form-page/planification-form-page.component';

const routes: Routes = [
    { path: '', component: MessageListComponent },
    { path: 'nouveau', component: MessageFormPageComponent },
    { path: 'automatisation/nouveau', component: AutomatisationFormPageComponent },
    { path: 'automatisation/:id', component: AutomatisationFormPageComponent },
    { path: 'planification/nouveau', component: PlanificationFormPageComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class MessagerieRoutingModule { }
