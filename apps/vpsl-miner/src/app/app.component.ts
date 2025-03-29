import { Component, inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { Router } from '@angular/router';

import { Buffer } from "buffer";
window.Buffer = window.Buffer || Buffer;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private readonly router: Router = inject(Router);
  private readonly matIconRegistry: MatIconRegistry = inject(MatIconRegistry);
  private readonly domSanitizer: DomSanitizer = inject(DomSanitizer);

  constructor() {
    this.matIconRegistry.addSvgIcon('refresh', this.domSanitizer.bypassSecurityTrustResourceUrl('/icons/refresh.svg'));
  }

  // public ngOnInit(): void {
  //   const script = document.createElement('script');
  //   script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback';
  //   script.defer = true;
  //   document.body.appendChild(script);

  //   // @ts-ignore
  //   window.onloadTurnstileCallback = () => {
  //     console.log('Turnstile script loaded.');
  //   };
  // }
}
