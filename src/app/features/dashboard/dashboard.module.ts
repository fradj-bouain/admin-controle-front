import { NgModule } from '@angular/core';
import { ChartModule } from 'primeng/chart';
import { SharedModule } from '../../shared/shared.module';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';

@NgModule({
    declarations: [DashboardComponent],
    imports: [SharedModule, DashboardRoutingModule, ChartModule]
})
export class DashboardModule { }
