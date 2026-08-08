import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MessageListComponent } from './message-list/message-list.component';
import { MessageFormPageComponent } from './message-form-page/message-form-page.component';
import { AutomatisationFormPageComponent } from './automatisation-form-page/automatisation-form-page.component';
import { PlanificationFormPageComponent } from './planification-form-page/planification-form-page.component';
import { MessageDetailPageComponent } from './message-detail-page/message-detail-page.component';

const routes: Routes = [
    // Liste (boîte de réception + envoyés) et détail : ouverts à CLIENT/ENTREPRISE par
    // le parent (voir app-routing.module.ts). Rédiger/automatisation/planification
    // restent réservés au SUPER_ADMIN — restriction explicite ici, sinon ces routes
    // hériteraient de l'ouverture faite au niveau du parent.
    { path: '', component: MessageListComponent },
    { path: 'nouveau', data: { roles: ['SUPER_ADMIN'] }, component: MessageFormPageComponent },
    { path: 'automatisation/nouveau', data: { roles: ['SUPER_ADMIN'] }, component: AutomatisationFormPageComponent },
    { path: 'automatisation/:id', data: { roles: ['SUPER_ADMIN'] }, component: AutomatisationFormPageComponent },
    { path: 'planification/nouveau', data: { roles: ['SUPER_ADMIN'] }, component: PlanificationFormPageComponent },
    { path: ':id', component: MessageDetailPageComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class MessagerieRoutingModule { }
