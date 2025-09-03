import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withEnabledBlockingInitialNavigation } from '@angular/router';
import { LOCALE_ID } from '@angular/core';
import '@angular/common/locales/global/ka';

import { App } from './app/app';
import { routes } from './app/app.routes';

// Zoneless CD
import { provideZonelessChangeDetection } from '@angular/core';

bootstrapApplication(App, {
  providers: [
    provideHttpClient(withFetch()),
    provideRouter(routes, withEnabledBlockingInitialNavigation()),
    provideZonelessChangeDetection(),   // <- zoneless ჩართვა
    { provide: LOCALE_ID, useValue: 'ka' },
  ],
}).catch(console.error);
