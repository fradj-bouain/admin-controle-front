import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConfigurationComponent } from './configuration.component';
import { UtilisateurFormPageComponent } from './utilisateur-form-page/utilisateur-form-page.component';

const routes: Routes = [
    { path: '', component: ConfigurationComponent },
    { path: 'utilisateurs/nouveau', component: UtilisateurFormPageComponent },
    { path: 'utilisateurs/:id', component: UtilisateurFormPageComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ConfigurationRoutingModule { }
