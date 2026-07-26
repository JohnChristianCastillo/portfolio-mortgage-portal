import { Routes } from '@angular/router';

import { SimulationComponent } from './simulation/simulation.component';
import { AuthComponent } from './auth/auth.component';

export const routes: Routes = [
  { path: '', component: SimulationComponent },
  { path: 'signup', component: AuthComponent, data: { mode: 'signup' } },
  { path: 'login', component: AuthComponent, data: { mode: 'login' } },
];
