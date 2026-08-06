import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { CalendarModule } from 'primeng/calendar';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';

import { ComingSoonComponent } from './components/coming-soon/coming-soon.component';
import { StatTileComponent } from './components/stat-tile/stat-tile.component';
import { RefuserDocumentDialogComponent } from './components/refuser-document-dialog/refuser-document-dialog.component';
import { NotifierDocumentDialogComponent } from './components/notifier-document-dialog/notifier-document-dialog.component';
import { ModeleFichierUploadComponent } from './components/modele-fichier-upload/modele-fichier-upload.component';
import { CardSkeletonComponent } from './components/card-skeleton/card-skeleton.component';
import { ValiderDocumentDialogComponent } from './components/valider-document-dialog/valider-document-dialog.component';

/**
 * Regroupe les modules PrimeNG et composants réutilisés par toutes les
 * feature modules (listes, popups d'ajout/édition, confirmations de
 * suppression) afin d'éviter de ré-importer ces mêmes modules partout.
 */
@NgModule({
    declarations: [ComingSoonComponent, StatTileComponent, RefuserDocumentDialogComponent, NotifierDocumentDialogComponent, ModeleFichierUploadComponent, CardSkeletonComponent, ValiderDocumentDialogComponent],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TranslateModule,
        TableModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        InputTextareaModule,
        ToastModule,
        ConfirmDialogModule,
        TagModule,
        ToolbarModule,
        CalendarModule,
        DropdownModule,
        TooltipModule,
        SkeletonModule
    ],
    exports: [
        CommonModule,
        ReactiveFormsModule,
        TranslateModule,
        TableModule,
        DialogModule,
        ButtonModule,
        InputTextModule,
        InputTextareaModule,
        ToastModule,
        ConfirmDialogModule,
        TagModule,
        ToolbarModule,
        CalendarModule,
        DropdownModule,
        TooltipModule,
        SkeletonModule,
        ComingSoonComponent,
        StatTileComponent,
        RefuserDocumentDialogComponent,
        NotifierDocumentDialogComponent,
        ModeleFichierUploadComponent,
        CardSkeletonComponent,
        ValiderDocumentDialogComponent
    ]
})
export class SharedModule { }
