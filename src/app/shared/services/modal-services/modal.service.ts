import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalSubject = new BehaviorSubject<{ type: string; data?: any } | null>(null);
  modal$ = this.modalSubject.asObservable();

  openModal(type: string, data?: any) {
    this.modalSubject.next({ type, data });
  }

  closeModal() {
    this.modalSubject.next(null);
  }
}
