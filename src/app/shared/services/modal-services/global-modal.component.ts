import { Component } from '@angular/core';
import { ModalService } from './modal.service';
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

      <!-- Lobby játékosok kezelése modal -->
      <ng-container *ngIf="modalData.type === 'managePlayers'">
        <app-lobby-players-managing
          [currentUser]="modalData.data.currentUser"
          [lobbyId]="modalData.data.lobbyId"
          [isModalOpen]="true"
          (closeModal)="closeModal()">
        </app-lobby-players-managing>
      </ng-container>
    </ng-container>
  `,
  styleUrls: ['./global-modal.component.scss']
})
export class GlobalModalComponent {
  modalData: any = null;

  constructor(private modalService: ModalService) {
    this.modalService.modal$.pipe(distinctUntilChanged()).subscribe((modal) => {
      console.log("Modal: ", modal)
      this.modalData = modal;
    });
  }

  // Modális bezárása
  closeModal() {
    this.modalService.closeModal();
  }
}
