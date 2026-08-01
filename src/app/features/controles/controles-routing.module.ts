import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ControleListComponent } from './controle-list/controle-list.component';
import { ControleFormPageComponent } from './controle-form-page/controle-form-page.component';
import { RapportFormPageComponent } from './rapport-form-page/rapport-form-page.component';
import { RapportDetailPageComponent } from './rapport-detail-page/rapport-detail-page.component';

const routes: Routes = [
    { path: '', component: ControleListComponent },
    { path: 'nouveau', component: ControleFormPageComponent },
    { path: 'rapports/nouveau', component: RapportFormPageComponent },
    { path: 'rapports/:id', component: RapportDetailPageComponent },
    { path: ':id', component: ControleFormPageComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ControlesRoutingModule { }
