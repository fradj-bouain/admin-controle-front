import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { DropdownModule } from 'primeng/dropdown';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { AppLayoutComponent } from './app.layout.component';
import { AppBreadcrumbComponent } from './app.breadcrumb.component';
import { AppSidebarComponent } from './app.sidebar.component';
import { AppTopbarComponent } from './app.topbar.component';
import { AppMenuComponent } from './app.menu.component';
import { AppMenuitemComponent } from './app.menuitem.component';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
    declarations: [
        AppLayoutComponent,
        AppBreadcrumbComponent,
        AppSidebarComponent,
        AppTopbarComponent,
        AppMenuComponent,
        AppMenuitemComponent
    ],
    imports: [
        BrowserModule,
        FormsModule,
        HttpClientModule,
        BrowserAnimationsModule,
        InputTextModule,
        ButtonModule,
        TooltipModule,
        RippleModule,
        DropdownModule,
        OverlayPanelModule,
        RouterModule,
        TranslateModule
    ]
})
export class AppLayoutModule { }
