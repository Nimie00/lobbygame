import {Injectable} from '@angular/core';
import {BehaviorSubject, Observable, Subject} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ModalService {
  private modalSubject = new BehaviorSubject<{type: string, data?: any} | null>(null);
  public modal$ = this.modalSubject.asObservable();

  private modalClosedSubject = new Subject<void>();
  public modalClosed$: Observable<void> = this.modalClosedSubject.asObservable();

  openModal(type: string, data?: any) {
    try {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && activeElement.blur) {
        activeElement.blur();
      }
      this.modalSubject.next({type, data});
    } catch (error) {
      console.error('Error opening modal:', error);
    }
  }

  closeModal() {
    this.modalSubject.next(null);
    this.modalClosedSubject.next();
  }

}
