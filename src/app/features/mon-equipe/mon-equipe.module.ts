import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { MonEquipeRoutingModule } from './mon-equipe-routing.module';
import { MonEquipeComponent } from './mon-equipe.component';

@NgModule({
    declarations: [MonEquipeComponent],
    imports: [SharedModule, MonEquipeRoutingModule, FormsModule]
})
export class MonEquipeModule { }
