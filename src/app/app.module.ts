import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { APP_BASE_HREF, CommonModule } from '@angular/common';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { LiveComponent } from './live/live.component';
import { StartComponent } from './startlist/start.component';
import { ResultComponent } from './results/results.component';
import { ColumnComponent } from './column/column.component';
import { GdfScrollModule } from './gdf-scrolling';

@NgModule({
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot([
      { path: '', component: HomeComponent, pathMatch: 'full'},
      { path: 'live', component: LiveComponent },
      { path: 'live/:eventId1', component: LiveComponent },
      { path: 'start', component: StartComponent },
      { path: 'start/:eventId1', component: StartComponent },
      { path: 'results/:catId', component: ResultComponent },
    ]),
    GdfScrollModule
  ],
  providers: [
    { provide: APP_BASE_HREF, useValue: '/'},
    HttpClient
  ],
  declarations: [ AppComponent, HomeComponent, LiveComponent, ColumnComponent, StartComponent, ResultComponent ],
  bootstrap: [ AppComponent ]
})
export class AppModule {}
