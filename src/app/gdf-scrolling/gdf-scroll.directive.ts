import { Directive, ElementRef, OnDestroy, Inject, AfterContentInit, Renderer, Output, Input } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';
import * as _gdfScroll  from './gdf-scroll.class';

/**
 * Default options for GdfScrollDirective. They override default GdfScroll options.
 * @see GdfScroll
 */
const DEFAULT_OPTIONS: _gdfScroll.IGdfScrollOptions = {
  selector: '> section',
};

/**
 * GdfScrollDirective
 *
 * Enables page on any element. See GdfScroll class for details.
 * If the content (pages) changes, you have to call RefreshPages()
 *
 * @see GdfScroll
 * @see IGdfScrollOptions
 */
@Directive({
  selector: '[gdf-scroll]',
  exportAs: 'gdf-scroll'
})
export class GdfScrollDirective extends _gdfScroll.GdfScroll implements OnDestroy, AfterContentInit {
  private static _uniqueId = 0;

  private _uniqueId = GdfScrollDirective._getUniqueId();

  /**
   * Options for the GdfScrollDirective
   * Changes after initialization are NOT applied!
   *
   * @see IGdfScrollOptions
   * @property {IGdfScrollOptions} options
   */
  @Input('gdf-scroll')
  options: _gdfScroll.IGdfScrollOptions;

  /**
   * Events observable
   * emits GdfScroll events.
   */
  @Output()
  get Events() { return this._gdfScrollEvents; }

  private static _getUniqueId() {
    return '__GdfScroll' + (GdfScrollDirective._uniqueId++);
  }

  constructor(
    @Inject(ElementRef) _elRef: ElementRef,
    @Inject(Renderer) private _rnderer: Renderer,
    @Inject(DOCUMENT) _doc: any  // @TODO: change type to Document, when https://github.com/angular/angular/issues/12631 is fixed
  ) {
    super(_elRef.nativeElement, _doc, DEFAULT_OPTIONS);
  }

  /**
   * Returns pages according to the selector.
   * Selector is always prepended with #elementId
   *
   * @protected
   * @returns {HTMLElement[]}
   */
  protected getPages(): HTMLElement[] {

    let originalId = this._containerElement.id;
    this._renderer.setElementProperty(this._containerElement, 'id', this._uniqueId);

    let nodeList = this._containerElement.querySelectorAll(`#${this._uniqueId} ${this._options.selector}`);
    let ret: HTMLElement[] = [];
    for (let i = 0, l = nodeList.length; i < l; i++) {
      ret.push(<HTMLElement>nodeList[i]);
    }
    this._renderer.setElementProperty(this._containerElement, 'id', originalId);
    return ret;
  }

  ngAfterContentInit() {
    this._init(this._rnderer, this.options);
  }

  ngOnDestroy() {
    this.Destroy();
  }
}
