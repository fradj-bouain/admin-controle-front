import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NotfoundRoutingModule } from './notfound-routing.module';
import { NotfoundComponent } from './notfound.component';

@NgModule({
    declarations: [NotfoundComponent],
    imports: [CommonModule, TranslateModule, NotfoundRoutingModule]
})
export class NotfoundModule { }
