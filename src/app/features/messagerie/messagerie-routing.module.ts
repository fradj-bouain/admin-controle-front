import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MessageListComponent } from './message-list/message-list.component';
import { MessageFormPageComponent } from './message-form-page/message-form-page.component';

const routes: Routes = [
    { path: '', component: MessageListComponent },
    { path: 'nouveau', component: MessageFormPageComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class MessagerieRoutingModule { }
