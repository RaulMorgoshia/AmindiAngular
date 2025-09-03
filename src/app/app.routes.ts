import { Routes } from '@angular/router';
import { Home } from './screens/home/home';

export const routes: Routes = [
    { path: "", component: Home },
    { path: "home", component: Home },
    { path: ":id", component: Home }
];


