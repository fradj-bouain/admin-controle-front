import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TabViewModule } from 'primeng/tabview';
import { InputTextareaModule } from 'primeng/inputtextarea';

import { SharedModule } from '../../shared/shared.module';
import { MessagerieRoutingModule } from './messagerie-routing.module';
import { MessageListComponent } from './message-list/message-list.component';
import { MessageFormPageComponent } from './message-form-page/message-form-page.component';

@NgModule({
    declarations: [MessageListComponent, MessageFormPageComponent],
    imports: [SharedModule, MessagerieRoutingModule, FormsModule, TabViewModule, InputTextareaModule, RouterModule]
})
export class MessagerieModule { }
