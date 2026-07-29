import { HttpClientModule } from '@angular/common/http';
import { NgModule, Optional, SkipSelf } from '@angular/core';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';

import { translateHttpLoaderFactory } from './i18n/translate-http-loader.factory';

/**
 * Regroupe tout ce qui n'existe qu'une seule fois dans l'application
 * (i18n, http). Importé uniquement par AppModule.
 */
@NgModule({
    imports: [
        HttpClientModule,
        TranslateModule.forRoot({
            loader: {
                provide: TranslateLoader,
                useFactory: translateHttpLoaderFactory,
                deps: [HttpClient]
            },
            defaultLanguage: 'fr'
        })
    ],
    exports: [TranslateModule]
})
export class CoreModule {
    constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
        if (parentModule) {
            throw new Error('CoreModule ne doit être importé que par AppModule.');
        }
    }
}
