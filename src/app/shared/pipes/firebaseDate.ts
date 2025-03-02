import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'firebaseDate'
})
export class FirebaseDatePipe implements PipeTransform {
  transform(value: any): Date {
    if (value && typeof value.toDate === 'function') {
      return value.toDate();
    }
    return value;
  }
}
