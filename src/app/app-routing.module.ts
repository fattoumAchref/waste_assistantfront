import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { DronefootageComponent } from './components/dronefootage/dronefootage.component';
import { DetectionComponent } from './components/detection/detection.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'drone-analysis', component: DronefootageComponent },
  { path: 'image-analysis', component: DetectionComponent },
  { path: '**', redirectTo: '' } // Redirect any unknown paths to home
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
