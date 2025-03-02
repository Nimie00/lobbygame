import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import { AuthService } from '../services/auth.service';
import {map} from "rxjs/operators";
import {take} from "rxjs";

export const AuthGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isUserLoggedIn().pipe(
    take(1),
    map(isLoggedIn => {
      if (isLoggedIn) {
        return true;
      } else {
        router.navigate(['/login']).then();
        return false;
      }
    })
  );
};
