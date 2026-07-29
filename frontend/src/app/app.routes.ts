import { Routes } from '@angular/router';

import { SimulationComponent } from './simulation/simulation.component';
import { AuthComponent } from './auth/auth.component';
import { ApplicationComponent } from './application/application.component';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', component: SimulationComponent },
  { path: 'signup', component: AuthComponent, data: { mode: 'signup' } },
  { path: 'login', component: AuthComponent, data: { mode: 'login' } },
  { path: 'apply', component: ApplicationComponent, canActivate: [authGuard] },  // check first (by running authGuard) if visitor is signed in or not
];
