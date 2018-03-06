import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GdfScrollDirective } from './gdf-scroll.directive';
import { GdfBodyScrollService } from './gdf-body-scroll.service';

@NgModule({
  imports: [ CommonModule ],
  declarations: [ GdfScrollDirective ],
  exports: [ GdfScrollDirective ],
  providers: [
    GdfBodyScrollService
  ]
})
export class GdfScrollModule { }
