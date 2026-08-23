import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { InputSwitchModule } from 'primeng/inputswitch';
import { PasswordModule } from 'primeng/password';
import { EditorModule } from 'primeng/editor';
import { SidebarModule } from 'primeng/sidebar';
import { SharedModule } from '../../shared/shared.module';
import { ClientsRoutingModule } from './clients-routing.module';
import { ClientListComponent } from './client-list/client-list.component';
import { ClientDetailComponent } from './client-detail/client-detail.component';

@NgModule({
    declarations: [ClientListComponent, ClientDetailComponent],
    imports: [SharedModule, ClientsRoutingModule, RouterModule, TooltipModule, FormsModule, InputSwitchModule, PasswordModule, EditorModule, SidebarModule]
})
export class ClientsModule { }
