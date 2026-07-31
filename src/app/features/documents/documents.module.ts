import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TabViewModule } from 'primeng/tabview';
import { CheckboxModule } from 'primeng/checkbox';
import { TooltipModule } from 'primeng/tooltip';

import { SharedModule } from '../../shared/shared.module';
import { DocumentsRoutingModule } from './documents-routing.module';
import { DocumentListComponent } from './document-list/document-list.component';
import { TypeDocumentFormPageComponent } from './type-document-form-page/type-document-form-page.component';
import { DocumentFormDialogComponent } from './document-form-dialog/document-form-dialog.component';
import { DocumentEtatFormDialogComponent } from './document-etat-form-dialog/document-etat-form-dialog.component';

@NgModule({
    declarations: [
        DocumentListComponent,
        TypeDocumentFormPageComponent,
        DocumentFormDialogComponent,
        DocumentEtatFormDialogComponent
    ],
    imports: [SharedModule, DocumentsRoutingModule, FormsModule, TabViewModule, CheckboxModule, RouterModule, TooltipModule]
})
export class DocumentsModule { }
