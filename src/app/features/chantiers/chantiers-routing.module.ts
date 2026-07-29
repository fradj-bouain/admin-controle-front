import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChantierListComponent } from './chantier-list/chantier-list.component';
import { ChantierDetailComponent } from './chantier-detail/chantier-detail.component';

const routes: Routes = [
    { path: '', component: ChantierListComponent },
    { path: 'nouveau', component: ChantierDetailComponent },
    { path: ':id', component: ChantierDetailComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ChantiersRoutingModule { }
