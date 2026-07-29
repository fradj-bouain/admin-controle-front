import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { SharedModule } from '../../shared/shared.module';
import { ClientsRoutingModule } from './clients-routing.module';
import { ClientListComponent } from './client-list/client-list.component';
import { ClientDetailComponent } from './client-detail/client-detail.component';

@NgModule({
    declarations: [ClientListComponent, ClientDetailComponent],
    imports: [SharedModule, ClientsRoutingModule, RouterModule, TooltipModule]
})
export class ClientsModule { }
