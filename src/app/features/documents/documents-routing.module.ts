import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DocumentListComponent } from './document-list/document-list.component';
import { TypeDocumentFormPageComponent } from './type-document-form-page/type-document-form-page.component';

const routes: Routes = [
    { path: '', component: DocumentListComponent },
    { path: 'types/nouveau', component: TypeDocumentFormPageComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class DocumentsRoutingModule { }
