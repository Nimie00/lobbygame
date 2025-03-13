import {Component, EventEmitter, Output} from '@angular/core';
import {ModalService} from '../services/modal.service';
import {distinctUntilChanged} from "rxjs";

@Component({
  selector: 'app-global-modal',
  template: `
    <ng-container *ngIf="modalData" class="modal-content">
      <ng-container *ngIf="modalData.type === 'createLobby'">
        <app-create-lobby-modal
          [currentUser]="modalData.data.currentUser"
          [lobby]="modalData.data.lobby"
          (closeModal)="closeModal()">
        </app-create-lobby-modal>
      </ng-container>

      <ng-container *ngIf="modalData.type === 'managePlayers'">
        <app-lobby-players-managing-modal
          [currentUser]="modalData.data.currentUser"
          [lobbyId]="modalData.data.lobbyId"
          [isModalOpen]="true"
          (closeModal)="closeModal()">
        </app-lobby-players-managing-modal>
      </ng-container>

      <ng-container *ngIf="modalData.type === 'settings'">
        <app-settings-modal
          (closeModal)="closeModal()">
        </app-settings-modal>
      </ng-container>

      <ng-container *ngIf="modalData.type === 'lobbyPassword'">
        <app-lobby-password-modal
          [currentUser]="modalData.data.currentUser"
          [lobby]="modalData.data.lobby"
          (closeModal)="closeModal()">
        </app-lobby-password-modal>
      </ng-container>
    </ng-container>
  `,
  styleUrls: ['./global-modal.component.scss']
})
export class GlobalModalComponent {
  modalData: any = null;
  @Output() modalClosed: EventEmitter<void> = new EventEmitter<void>();


  constructor(private modalService: ModalService) {
    this.modalService.modal$.pipe(distinctUntilChanged()).subscribe((modal) => {
      this.modalData = modal;
    });
  }

  closeModal() {
    this.modalService.closeModal();
    this.modalClosed.emit();
  }
}
