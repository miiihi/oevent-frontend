import { Injectable, Renderer, Inject, ApplicationRef } from '@angular/core';
import { DOCUMENT } from '@angular/platform-browser';
import { GdfScroll, IGdfScrollOptions } from './gdf-scroll.class';

/**
 * Default options for GdfBodyScrollService. They override default GdfScroll options.
 * @see GdfScroll
 */
const DEFAULT_OPTIONS: IGdfScrollOptions = {
  selector: 'section',
};

/**
 * GdfBodyScrollService
 *
 * Enables page scrolling on body. See GdfScroll class for details
 * If the content (pages) changes, you have to call RefreshPages()
 *
 * @see GdfScroll
 * @see IGdfScrollOptions
 */
@Injectable()
export class GdfBodyScrollService extends GdfScroll {

  /**
   * Events observable
   * emits GdfScroll events.
   */
  get Events() { return this._gdfScrollEvents; }

  constructor(
    @Inject(DOCUMENT) _doc: any,  // @TODO: change type to Document, when https://github.com/angular/angular/issues/12631 is fixed
    @Inject(ApplicationRef) _appRef: ApplicationRef
  ) {
    super(_doc.body, _doc, DEFAULT_OPTIONS );
  }

  /**
   * Initialize GdfScroll
   *
   * @param {Renderer} renderer
   * @param {IGdfScrollOptions} [options]
   * @param {number} [index]
   * @returns {void}
   */
  public Init(renderer: Renderer, options?: IGdfScrollOptions, index: number = null) {
    super._init(renderer, options, index);
  }

  /**
   * Returns pages according to the selector.
   *
   * @protected
   * @returns {HTMLElement[]}
   */
  protected getPages(): HTMLElement[] {
    let nodeList = this._document.querySelectorAll(this._options.selector);
    let ret: HTMLElement[] = [];
    for (let i = 0, l = nodeList.length; i < l; i++) {
      ret.push(<HTMLElement>nodeList[i]);
    }
    return ret;
  }
}
