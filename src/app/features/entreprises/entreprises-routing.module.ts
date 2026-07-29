import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { EntrepriseListComponent } from './entreprise-list/entreprise-list.component';
import { EntrepriseDetailComponent } from './entreprise-detail/entreprise-detail.component';

const routes: Routes = [
    { path: '', component: EntrepriseListComponent },
    { path: 'nouveau', component: EntrepriseDetailComponent },
    { path: ':id', component: EntrepriseDetailComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class EntreprisesRoutingModule { }
