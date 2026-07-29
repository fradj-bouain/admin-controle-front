import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app.layout.component';
import { AuthGuard } from './core/auth/auth.guard';

const routerOptions: ExtraOptions = {
    anchorScrolling: 'enabled'
};

const routes: Routes = [
    { path: 'login', loadChildren: () => import('./features/login/login.module').then(m => m.LoginModule) },
    {
        path: '',
        component: AppLayoutComponent,
        canActivate: [AuthGuard],
        canActivateChild: [AuthGuard],
        children: [
            { path: '', loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule) },
            { path: 'clients', data: { breadcrumb: 'menu.clients' }, loadChildren: () => import('./features/clients/clients.module').then(m => m.ClientsModule) },
            { path: 'chantiers', data: { breadcrumb: 'menu.chantiers' }, loadChildren: () => import('./features/chantiers/chantiers.module').then(m => m.ChantiersModule) },
            { path: 'entreprises', data: { breadcrumb: 'menu.entreprises' }, loadChildren: () => import('./features/entreprises/entreprises.module').then(m => m.EntreprisesModule) },
            { path: 'salaries', data: { breadcrumb: 'menu.salaries' }, loadChildren: () => import('./features/salaries/salaries.module').then(m => m.SalariesModule) },
            { path: 'controles', data: { breadcrumb: 'menu.controles' }, loadChildren: () => import('./features/controles/controles.module').then(m => m.ControlesModule) },
            { path: 'documents', data: { breadcrumb: 'menu.documents' }, loadChildren: () => import('./features/documents/documents.module').then(m => m.DocumentsModule) },
            { path: 'messagerie', data: { breadcrumb: 'menu.messagerie' }, loadChildren: () => import('./features/messagerie/messagerie.module').then(m => m.MessagerieModule) },
            { path: 'configuration', data: { breadcrumb: 'menu.configuration', roles: ['SUPER_ADMIN', 'ADMIN'] }, loadChildren: () => import('./features/configuration/configuration.module').then(m => m.ConfigurationModule) }
        ]
    },
    { path: 'notfound', loadChildren: () => import('./features/notfound/notfound.module').then(m => m.NotfoundModule) },
    { path: '**', redirectTo: '/notfound' }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, routerOptions)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
