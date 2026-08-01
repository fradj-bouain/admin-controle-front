import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MonEquipeComponent } from './mon-equipe.component';

const routes: Routes = [
    { path: '', component: MonEquipeComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class MonEquipeRoutingModule { }
