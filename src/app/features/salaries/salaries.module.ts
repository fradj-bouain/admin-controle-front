import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { SharedModule } from '../../shared/shared.module';
import { SalariesRoutingModule } from './salaries-routing.module';
import { SalarieListComponent } from './salarie-list/salarie-list.component';
import { SalarieDetailComponent } from './salarie-detail/salarie-detail.component';
import { QrCodeDialogComponent } from './qrcode-dialog/qrcode-dialog.component';

@NgModule({
    declarations: [SalarieListComponent, SalarieDetailComponent, QrCodeDialogComponent],
    imports: [SharedModule, SalariesRoutingModule, TooltipModule, RouterModule, FormsModule, CheckboxModule]
})
export class SalariesModule { }
