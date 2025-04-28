import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-password-dialogue',
  standalone: false,
  templateUrl: './password-dialogue.component.html',
  styleUrl: './password-dialogue.component.scss',
})
export class PasswordDialogueComponent implements OnInit {
  public passwordForm!: FormGroup;
  public isForCreate = true;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PasswordDialogueComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { isForCreate: boolean },
  ) {}

  ngOnInit() {
    this.isForCreate = this.data?.isForCreate ?? true;
    this.passwordForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
    });

    if (this.isForCreate) {
      this.passwordForm.setValidators(this.createPasswordMatchValidator());
    } else {
      this.passwordForm.removeControl('confirmPassword');
    }
  }

  createPasswordMatchValidator(): ValidatorFn {
    return (group: AbstractControl): ValidationErrors | null => {
      const password = group.get('password')?.value;
      const confirmPassword = group.get('confirmPassword')?.value;

      if (password && confirmPassword && password !== confirmPassword) {
        group.get('confirmPassword')?.setErrors({ mismatch: true });
        return { mismatch: true };
      }

      const confirmControl = group.get('confirmPassword');
      if (confirmControl?.hasError('mismatch')) {
        const errors = { ...confirmControl.errors };
        delete errors['mismatch'];
        confirmControl.setErrors(Object.keys(errors).length ? errors : null);
      }

      return null;
    };
  }

  onConfirm() {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.passwordForm.get('password')?.value);
  }

  onCancel() {
    this.dialogRef.close();
  }
}
