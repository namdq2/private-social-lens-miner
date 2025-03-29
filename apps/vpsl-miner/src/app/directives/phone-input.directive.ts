import { Directive, ElementRef, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';

@Directive({
  selector: '[appPhoneInput]',
  standalone: false,
})
export class PhoneInputDirective {

  constructor(private el: ElementRef, private control: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Ensure the value starts with a '+'
    if (!value.startsWith('+')) {
      value = '+' + value.replace(/[^0-9]/g, '');
    } else {
      value = '+' + value.substring(1).replace(/[^0-9]/g, '');
    }

    // Update the input value
    input.value = value;

    // Update the ngModel value
    if (this.control.control) {
      this.control.control.setValue(value, { emitEvent: false });
    }
  }
}