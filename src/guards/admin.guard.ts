import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { from, Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { UserContextService } from '../services/user-context.service';

@Injectable({ providedIn: 'root' })
export class AdminGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private userContext: UserContextService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean | UrlTree> {
    const user = this.authService.currentUser();
    if (!user) {
      return this.authService.getSession().pipe(
        map((session) => {
          if (!session) return this.router.parseUrl('/login');
          return true;
        }),
        switchMap((res) => {
          if (res !== true) return of(res);
          return from(this.userContext.ensureMembership()).pipe(
            map((m) => (m && (m.isRoot || m.role === 'admin') ? true : this.router.parseUrl('/clients'))),
            catchError(() => of(this.router.parseUrl('/clients')))
          );
        }),
        catchError(() => of(this.router.parseUrl('/login')))
      );
    }

    return from(this.userContext.ensureMembership()).pipe(
      map((m) => (m && (m.isRoot || m.role === 'admin') ? true : this.router.parseUrl('/clients'))),
      catchError(() => of(this.router.parseUrl('/clients')))
    );
  }
}
