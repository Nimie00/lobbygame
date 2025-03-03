// animations.ts
import { trigger, transition, style, animate, keyframes, state } from '@angular/animations';

export const countdownAnimation = trigger('countdownAnimation', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.3)' }),
    animate('0.5s ease-out', style({ opacity: 1, transform: 'scale(1)' }))
  ]),
  transition(':leave', [
    animate('0.5s ease-in', style({ opacity: 0, transform: 'scale(0.3)' }))
  ])
]);

export const playerChoiceAnimation = trigger('playerChoiceAnimation', [
  state('void', style({ opacity: 0 })),
  state('*', style({ opacity: 1 })),
  transition('void => *', [
    animate('0.3s ease-out', keyframes([
      style({ opacity: 0, transform: 'translateY(50%)', offset: 0 }),
      style({ opacity: 1, transform: 'translateY(-20%)', offset: 0.7 }),
      style({ opacity: 1, transform: 'translateY(0)', offset: 1 })
    ]))
  ])
]);

export const resultAnimation = trigger('resultAnimation', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('0.3s ease-out', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('0.3s ease-in', style({ opacity: 0 }))
  ])
]);

export const finalChoice = trigger('finalChoice', [
  state('shown', style({transform: 'translateX(0)', opacity: 1})),
  transition(':enter', [
    style({transform: 'translateX(45%)', opacity: 0}),
    animate('0.3s ease-out')
  ]),
  state('shownPlayer', style({transform: 'translateX(0)', opacity: 1})),
  transition(':enter', [
    style({transform: 'translateX(-45%)', opacity: 0}),
    animate('0.3s ease-out')
  ])
]);

export const cycleAnimation = trigger('cycleAnimation', [
  transition(':enter', [
    style({ transform: 'translateX(+100%) translateY(-50%)', opacity: 0 }),
    animate('1s ease-out', style({ transform: 'translateX(-100%) translateY(-50%)', opacity: 0.8 })),
    animate('0.2s ease-out', style({ transform: 'translateX(-105%) translateY(-50%)', opacity: 0 }))
  ])
]);

export const playerMoveToCenter = trigger('playerMoveToCenter', [
  transition('* => *', [
    animate('1.5s cubic-bezier(0.2, 1, 0.5, 1)',
      keyframes([
        style({ transform: 'translateY(-50%)', offset: 0 }),
        style({ transform: 'translateX(calc(25vw)) translateY(-50%)', offset: 0.5 }),
        style({ transform: 'translateX(calc(25vw)) translateY(-50%)', offset: 0.6 }),
        style({ transform: 'translateX(-50%) translateY(-50%)', offset: 1 })
      ])
    )
  ])
]);

export const moveToCenterOpponent = trigger('moveToCenterOpponent', [
  transition('* => *', [
    animate('1.5s cubic-bezier(0.2, 1, 0.5, 1)',
      keyframes([
        style({ transform: 'translateY(-50%)', offset: 0 }),
        style({ transform: 'translateX(calc(-25vw)) translateY(-50%)', offset: 0.5 }),
        style({ transform: 'translateX(calc(-25vw)) translateY(-50%)', offset: 0.6 }),
        style({ transform: 'translateX(+50%) translateY(-50%)', offset: 1 })
      ])
    )
  ])
]);

export const spriteAnimation = trigger('spriteAnimation', [
  transition(':enter', [
    animate('2.5s steps(39)', keyframes([
      style({
        objectPosition: '-7800px 0',
        offset: 1
      })
    ]))
  ])
]);

export const player1MoveToCenter = trigger('player1MoveToCenter', [
  transition('* => *', [
    animate('1.5s cubic-bezier(0.2, 1, 0.5, 1)',
      keyframes([
        style({transform: 'translateY(-50%)', offset: 0}),
        style({transform: 'translateX(calc(25vw)) translateY(-50%)', offset: 0.5}),
        style({transform: 'translateX(calc(25vw)) translateY(-50%)', offset: 0.6}),
        style({transform: 'translateX(-50%) translateY(-50%)', offset: 1})
      ])
    )
  ])
]);

export const player2MoveToCenter =  trigger('player2MoveToCenter', [
  transition('* => *', [
    animate('1.5s cubic-bezier(0.2, 1, 0.5, 1)',
      keyframes([
        style({transform: 'translateY(0) translateY(-50%)', offset: 0}),
        style({transform: 'translateX(calc(-25vw)) translateY(-50%)', offset: 0.5}),
        style({transform: 'translateX(calc(-25vw)) translateY(-50%)', offset: 0.6}),
        style({transform: 'translateX(+50%) translateY(-50%)', offset: 1})
      ])
    )
  ])
]);

export const spriteAnimationShort =   trigger('spriteAnimationShort', [
  transition(':enter', [
    animate('1.3s steps(39)', keyframes([
      style({
        objectPosition: '-7800px 0',
        offset: 1,
      })
    ]))
  ])
])
