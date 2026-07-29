import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SalarieListComponent } from './salarie-list/salarie-list.component';
import { SalarieDetailComponent } from './salarie-detail/salarie-detail.component';

const routes: Routes = [
    { path: '', component: SalarieListComponent },
    { path: 'nouveau', component: SalarieDetailComponent },
    { path: ':id', component: SalarieDetailComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SalariesRoutingModule { }
