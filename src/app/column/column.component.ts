import { Component, OnInit, OnDestroy, Input, ElementRef, Output, EventEmitter, ViewChild, AfterViewInit, NgZone } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { IGdfScrollOptions, GdfScrollDirective, ANIMATION_NONE, IGdfScrollEvent, GdfScrollEventType, SyncFrames } from '../gdf-scrolling';

const STEP_FACTOR = 0.2;
const DELAY = 5000;

interface ICol {
  idx: number;
  cats: Array<ICat>;
}

interface ICat {
  id: number;
  name: string;
  items: Array<any>;
}

@Component({
  selector: 'column',
  templateUrl: 'column.component.html',
})
export class ColumnComponent implements AfterViewInit {
  private _col: ICol;

  private _parent;

  public scrollOptions: IGdfScrollOptions = {
    selector: '.o-cat',
    keyboardOn: false,
    mouseOn: false,
    swipeOn: false,
    scrollPagePx: 0,
    recognizePagePx: 0,
    animation: {
      stepFunction: (timestamp) => {
        return timestamp * STEP_FACTOR;
      }
    },
    frameFn: SyncFrames
  };

  public inScroll = false;

  @ViewChild('scrollDir') scrollDir: GdfScrollDirective;

  @Input('col')
  set col(val) {
    this._col = val;
  }
  get col(): ICol {
    return this._col;
  }

  @Input('showEmpty')
  showEmpty = false;

  @Output()
  stopCat = new EventEmitter<number>();

  @Output()
  startCat = new EventEmitter<number>();

  constructor(private _route: ActivatedRoute, private _elRef: ElementRef, private _zone: NgZone) { }

  ngAfterViewInit() {
    this._parent = this._elRef.nativeElement.querySelector('.o-scroll');
    setTimeout(() => this.startScroll(), 5000 );
    this.scrollDir.Events.map(evt => { console.log(evt); return evt; }).
    filter( evt => evt.type === GdfScrollEventType.MOVE_FINISHED).subscribe(() => this.scrollFinished());
  }

   /*
    - fix the cat
    - scroll to next.
    - fix the offset
    - move cat to bottom
    - unfix the cat
    - wait x seconds
    - repeat.
    */
  startScroll() {

    if (this.scrollDir.HasOverflow) {

      this.stopCat.emit(this.col.cats[0].id);
      this.stopCat.emit(this.col.cats[1].id);
      if (!this.scrollDir.RefreshPages()) { this.scrollDir.RefreshOffsets(); }

      setTimeout(() => this.scrollDir.ScrollTo(1));
      this.inScroll = true;
    } else {
      setTimeout(() => this.startScroll(), DELAY);
    }
  }

  scrollFinished() {
    if (!this.inScroll) { return; } else { this.inScroll = false; }

    const i1 = this.col.cats[0].id;
    const i2 = this.col.cats[1].id;

    this.col.cats.push(this.col.cats.shift());

    this.scrollDir.ScrollTo(0, ANIMATION_NONE);
    this.startCat.emit(i1);
    this.startCat.emit(i2);

    setTimeout(() => this.startScroll(), DELAY);
  }

  getCatId(index, cat: ICat): number {
    return cat.id;
  }

  getItemId(index, item): number {
    return item.ID;
  }
}
