import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app/app';
import { provideZoneChangeDetection } from '@angular/core';

bootstrapApplication(App, {
  providers: [
    provideHttpClient(),
    provideZoneChangeDetection({ eventCoalescing: true })
  ]
}).catch((err) => console.error(err));
