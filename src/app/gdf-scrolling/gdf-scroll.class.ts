import { Renderer, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/observable/fromevent';
import 'rxjs/add/operator/mapto';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/merge';
import 'rxjs/add/operator/takeuntil';
import 'rxjs/add/operator/mergeall';
import 'rxjs/add/operator/every';
import 'rxjs/add/operator/filter';

import './debounceTimeWFirstSubscriber';

/**
 * Animation easing functions enum.
 */
export enum GdfScrollEasingFunction {
  LINEAR,
  IN_QUAD,
  OUT_QUAD,
  INOUT_QUAD,
  IN_CUBIC,
  OUT_CUBIC,
  INOUT_CUBIC,
  IN_QUART,
  OUT_QUART,
  INOUT_QUART,
  IN_QUINT,
  OUT_QUINT,
  INOUT_QUINT
}

/**
 * Animation easing function interface.
 * Easing function receives a float with a fraction of time elapsed (0 to 1),
 * it has to return a float (0 to 1), which represents a fraction of the animation to be applied at the give time.
 */
export interface IGdfScrollEasingFunction {
  (percDuration: number): number;
}

/**
 * Animation step function interface.
 * Easing function receives timestamp since the begging of animation
 * it has to return an offstet spet in px to take
 */
export interface IGdfScrollStepFunction {
  (timestamp: number): number;
}

/**
 * IGdfScrollAnimation interface
 *
 * @param {number} duration of animation in miliseconds. 0 means no animation.
 * @param {GdfScrollEasingFunction | IGdfScrollEasingFunction} easingFunc to use
 */
export interface IGdfScrollAnimation {
  duration?: number;
  easingFunction?: GdfScrollEasingFunction | IGdfScrollEasingFunction;
  stepFunction?: IGdfScrollStepFunction;
}

/**
 * IGdfScrollOptions interace
 *
 * @param {string} selector CSS selector which returns elements that will be used as pages.
 *                          gdf-scroll directive prepends this selector with an id of the element on which it is applied.
 * @param {boolean} keyboardOn Enable keyboard interactions (PgUp/PgDown). Defaults to true.
 * @param {boolean} mouseOn Enable mouse wheel interactions. Defaults to true.
 * @param {boolean} swipeOn Enable touch (swipeUp/swipeDown) interactions. Defaults to true.
 * @param {number} scrollPagePx Controls, if user interactions (keyboard/mouse/swipe) scroll to the pages.
 *                              -1: Auto - scrollPage is enabled if max page height <= viewport height
 *                               0: scrollPage is disabled
 *                              >0: scrollPage is enabled, if viewport height is greater than value
 *                            If scrollPage is disabled, then user interaction is disabled (listeners are removed),
 *                            but ScrollTo, ScrollPrevious and ScrollNext methods are still available.
 *                            Defaults to -1
 * @param {boolean} resizeStayOnPage If enabled, then we make sure, that if we were on the exact page before resize
 *                                   we stay on that exact page. Default to true.
 * @param {number} debounceResize Miliseconds to debounce resize events. Defaults to 100
 * @param {number} debounceScroll Miliseconds to debounce scroll events. Defaults to 100
 * @param {IGdfScrollAnimation} animation Animation to use when scrolling.
 *                              Defaults to { duration: 1000, easingFunction: GdfScrollEasingFunction.INOUT_QUINT}
 * @param {number} recognizePagePx Page index recognition strategy. Defines when the page index transition occurs when scrolling.
 *                              -1: center of container, DEFAULT. The reported page index is of that page, that is visible
 *                                  in the center of the container
 *                              >=0: Offset from the top of the container. If 0, the reported page index is of that page, that
 *                                  is shown at the top of the container
 */
export interface IGdfScrollOptions {
  selector?: string;
  keyboardOn?: boolean;
  mouseOn?: boolean;
  swipeOn?: boolean;
  scrollPagePx?: number; // -1: auto, 0: off, >0 px
  resizeStayOnPage?: boolean;
  debounceResize?: number; // ms
  debounceScroll?: number; // ms
  animation?: IGdfScrollAnimation;
  recognizePagePx?: number;
  frameFn?: Function;
}

/**
 * ANIMATION_NONE constant disables animation.
 */
export const ANIMATION_NONE: IGdfScrollAnimation = {
  duration: 0,
  easingFunction: null,
  stepFunction: null,
};

/**
 * GdfScrollEventType enum:
 * INDEX_CHANGED:   triggered when index is changed, data contains new index
 * EXACT_INDEX_CHANGED: triggered when exact index is changed, data contains new exact index.
 * INITIALIZED: triggered after directive/service has been initialized
 * DESTROYED: triggered after directive/service has been destroyed
 */
export enum GdfScrollEventType {
  INDEX_CHANGED,
  EXACT_INDEX_CHANGED,
  INITIALIZED,
  DESTROYED,
  MOVE_FINISHED
}

/**
 * IGdfScrollEvent interace
 *
 * @param {GdfScrollEventType} type
 * @param {any} data
 */
export interface IGdfScrollEvent {
  type: GdfScrollEventType;
  data: any;
}

interface IPageData {
  scrollTop: number;
  scrollBottom: number;
  scrollHeight: number;
}

const PAGE_DOWN = 'PageDown';
const PAGE_UP = 'PageUp';
const ARROW_DOWN = 'ArrowDown';
const ARROW_UP = 'ArrowUp';
const SCROLL_KEYS = [PAGE_DOWN, PAGE_UP, ARROW_DOWN, ARROW_UP];

const SCROLL_EVENT = 'scroll';
const RESIZE_EVENT = 'resize';
const RESIZE_AFTER_SCROLL_BUFFER_MS = 50;

/**
 * Base class for gdf-scroll directive and GdfBodyScrollService
 */
export abstract class GdfScroll {
  protected _gdfScrollEvents = new EventEmitter<IGdfScrollEvent>();

  protected _pages: HTMLElement[] = [];
  protected _pagesData: IPageData[] = [];
  private _maxPageHeight: number;

  /**
   * Default options.
   */
  protected _options: IGdfScrollOptions = {
    keyboardOn: true,
    mouseOn: true,
    swipeOn: true,
    scrollPagePx: -1,
    debounceResize: 50,
    debounceScroll: 50,
    resizeStayOnPage: true,
    animation: {
      duration: 1000,
      easingFunction: GdfScrollEasingFunction.INOUT_QUINT
    },
    recognizePagePx: -1,
    frameFn: window.requestAnimationFrame
  };

  private _initialized = false;
  /**
   * @readonly
   * @property {boolean} Initialized True if directive/service has been initialized
   */
  public get Initialized() {
    return this._initialized;
  }

  private _lastPosition: string;
  private _lastWidth: string;

  private _overflowOn: boolean = null;
  /**
   * @readonly
   * @property {boolean} OverflowOn True, if overflow is enabled. Use ToggleOverflow/EnableOverflow/DisableOverflow to change
   */
  public get OverflowOn() {
    return this._overflowOn;
  }

  private _keyboardRegistration = null;
  /**
   * @readonly
   * @property {boolean} KeyboardActive True, if keyboard is active. To be active, it has to be On and ScrollPage has to be on
   */
  public get KeyboardActive() {
    return this._keyboardRegistration !== null;
  }

  /**
   * @readonly
   * @property {boolean} KeyboardOn True, if keyboard is enabled. Use ToggleKeyboard/EnableKeyboard/DisableKeyboard to change
   */
  public get KeyboardOn() {
    return this._options.keyboardOn;
  }

  private _mouseRegistration = null;
  /**
   * @readonly
   * @property {boolean} MouseActive True, if mouse is active. To be active, it has to be On and ScrollPage has to be on
   */
  public get MouseActive() {
    return this._mouseRegistration !== null;
  }

  /**
   * @readonly
   * @property {boolean} MouseOn True, if mouse is enabled. Use ToggleMouse/EnableMouse/DisableMouse to change
   */
  public get MouseOn() {
    return this._options.mouseOn;
  }

  private _swipeRegistrations = null;
  /**
   * @readonly
   * @property {boolean} SwipeActive True, if swipe is active. To be active, it has to be On and ScrollPage has to be on
   */
  public get SwipeActive() {
    return this._swipeRegistrations !== null;
  }

  /**
   * @readonly
   * @property {boolean} SwipeOn True, if swipe is enabled. Use ToggleSwipe/EnableSwipe/DisableSwipe to change
   */
  public get SwipeOn() {
    return this._options.swipeOn;
  }

  private _scrollPageOn: boolean = null;
  /**
   * @readonly
   * @property {boolean} ScrollPageOn True, if scroll to page enabled. Use ScrollPagePx to change
   */
  public get ScrollPageOn() {
    return this._scrollPageOn;
  }
  private set scrollPageOn(val: boolean) {
    if (this._scrollPageOn !== val) {
      this._scrollPageOn = val;

      this._refreshKeyboard();
      this._refreshMouse();
      this._refreshSwipe();
    }
  }

  private _pauseSystemInteractions = false;
  private _prepausedScrollPagePx: number = null;
  private _scrollPagePx: number;
  /**
   * @property {number} ScrollPagePx Controls, if user interactions (keyboard/mouse/swipe) scroll to the pages.
   *                              -1: Auto - scrollPage is enabled if max page height <= viewport height
   *                               0: scrollPage is disabled
   *                              >0: scrollPage is enabled, if viewport height is greater than value
   *                            If scrollPage is disabled, then user interaction is disabled (listeners are removed),
   *                            but ScrollTo, ScrollPrevious and ScrollNext methods are still available.
   */
  public get ScrollPagePx(): number {
    return this._scrollPagePx;
  }
  public set ScrollPagePx(val: number) {
    this._scrollPagePx = val;
    this._refreshScrollPage();
  }

  private _index: number;
  /**
   * @readonly
   * @property {number} Index Current page index. 0-based. We are on a page, if the container's viewport top is inside the page.
   *                          Null if we are not on any page.
   */
  public get Index(): number {
    return this._index;
  }
  private _setIndex(val) {
    if (this._index !== val) {
      this._index = val;
      this._gdfScrollEvents.emit({type: GdfScrollEventType.INDEX_CHANGED, data: this._index});
    }
  }

  private _exactIndex: number;
  /**
   * @readonly
   * @property {number} Index Current exact page index. 0-based. We are exactly on a page, if the container's viewport top is
   *                          at the top the page. Null otherwise.
   */
  public get ExactIndex() {
    return this._exactIndex;
  }
  private _refreshExactIndex() {
    let exact = this.IsExactIndex ? this.Index : null;
    if (this._exactIndex !== exact) {
      this._exactIndex = exact;
      this._gdfScrollEvents.emit({type: GdfScrollEventType.EXACT_INDEX_CHANGED, data: exact});
    }
  }

  /**
   * @readonly
   * @property {boolean} IsExactIndex True, current index is exact index.
   */
  public get IsExactIndex(): boolean {
    // allow for 1px tolerance, because of float scrollTop
    return this.Index === null ? false : Math.abs(this.Offset - this._pagesData[this.Index].scrollTop) < 1;
  }

  /**
   * @readonly
   * @property {number} Offset Current offset.
   */
  public get Offset(): number {
    if (this.IsOnBody) {
      return this.OverflowOn ?
        this._containerElement.scrollTop || this._document.documentElement.scrollTop :
        -1 * parseFloat(this._containerElement.style.marginTop); // we have to change the margin sign!
    } else {
      return this._containerElement.scrollTop;
    }
  }

  /**
   * @property {boolean} _animationInProgress
   */
  private _animationInProgress = false;

  /**
   * Updates current offset to given value using given animation and
   * calling _onOffsetSet on finishing.
   *
   * @private
   * @param {number} offset value
   * @param {IGdfScrollAnimation} [animation] Animation to use. Defaults to animation from options.
   * @param {void}
   */
  private _animateOffset(offset: number, animation?: IGdfScrollAnimation): void {
    const offsetStart = this.Offset;
    const offsetDiff = offset - offsetStart;

    if (offsetDiff === 0) {
      return;
    }

    const _animation = Object.assign({}, this._options.animation, animation);
    if (!((_animation.duration > 0 && (_animation.easingFunction)) || (_animation.stepFunction))) {
      // skip animation
      this._setOffset(offset);
      this._gdfScrollEvents.emit({type: GdfScrollEventType.MOVE_FINISHED, data: null});
      this.RefreshIndex();
      return;
    }

    let start_timestamp;
    let prev_timestamp = 0;
    const easingFunc = _animation.easingFunction ? (typeof _animation.easingFunction === 'function' ?
      _animation.easingFunction : _getEasingFunc(_animation.easingFunction)) : null;
    const _self = this;

    this._animationInProgress = true;

    this._options.frameFn(function step(timestamp) {
      if (!start_timestamp) { start_timestamp = prev_timestamp = timestamp; }
      const time = timestamp - start_timestamp;

      if (easingFunc) {
        const fraction = easingFunc(Math.min(time / _animation.duration, 1));
        _self._setOffset(offsetStart + offsetDiff * fraction);
        if (time < _animation.duration) {
          _self._options.frameFn(step);
        } else {
          _self._animationInProgress = false;
          _self._gdfScrollEvents.emit({type: GdfScrollEventType.MOVE_FINISHED, data: null});
          _self.RefreshIndex();
        }
      } else if (_animation.stepFunction) {
        const direction = offsetDiff / Math.abs(offsetDiff);
        const stepOff = prev_timestamp === 0 ? 0 : Math.round(_animation.stepFunction(timestamp - prev_timestamp));
        if (stepOff > 0) {
          prev_timestamp = timestamp;
        }

        const newOff = _self.Offset + direction * stepOff;

        if ((direction > 0 && newOff < offsetStart + offsetDiff ) || (direction < 0 && newOff > offsetStart + offsetDiff)) {
          _self._setOffset(newOff);
          _self._options.frameFn(step);
        } else {
          _self._animationInProgress = false;
          _self._setOffset( offsetStart + offsetDiff);
          _self._gdfScrollEvents.emit({type: GdfScrollEventType.MOVE_FINISHED, data: null});
          _self.RefreshIndex();
        }
      }
    });
  }

  /**
   * Updates current offset to given value
   *
   * @private
   * @param {number} offset value
   * @return {void}
   */
  private _setOffset(y: number): void {
    if (this.IsOnBody) {
      if (this.OverflowOn) {
        window.scrollBy(0, y - this.Offset);
      } else {
        // if overflow is off, we use margin on body.
        // we have to change the margin sign!
        this._renderer.setElementStyle(this._containerElement, 'margin-top', `-${y}px`);
      }
    } else {
      this._renderer.setElementProperty(this._containerElement, 'scrollTop', y);
    }
  }

  public get HasOverflow() {
    return (this._getContainerScrollHeight() > this._getContainerClientHeight());
  }

  private _isOnBody: boolean;
  /**
   * @readonly
   * @property {boolean} IsOnBody True, if scroll service is being used on body
   */
  public get IsOnBody(): boolean {
    return this._isOnBody;
  }

  private _resizeSubscription: Subscription;
  private _scrollSubscription: Subscription;
  protected _renderer: Renderer;

  constructor(
    protected _containerElement: HTMLElement,
    protected _document: Document,
    options: IGdfScrollOptions
  ) {
    Object.assign(this._options, options);
    this._isOnBody = (this._containerElement.tagName.toLowerCase() === 'body');
  }

  /**
   * Initialization.
   * - sets the options
   * - refreshes pages
   * - register's global event listeners scroll/resize
   * - scrolls to given index
   *
   * @protected
   * @param {Rendere} renderer
   * @param {IGdfScrollOptions} options
   * @param {number} index
   * @returns {void}
   */
  protected _init(renderer: Renderer, options?: IGdfScrollOptions, index = null): void {
    // bail out, if no window
    if (typeof window === 'undefined') { return; }

    this._renderer = renderer;
    Object.assign(this._options, options || {});

    if (this.IsOnBody) {
      this._overflowOn = this._containerElement.style.position !== 'fixed';

      // If on body and disabled, we need last position and width, which will be applied on enabling.
      if (!this.OverflowOn) {
        this._lastPosition = 'static';
        this._lastWidth = this._containerElement.style.width;
      }
    } else {
      this._overflowOn = this._containerElement.style.overflowY !== 'hidden';
    }
    this._scrollPagePx = this._options.scrollPagePx;

    this.RefreshPages();

    // resize and scroll events observables

    let scrollEvts = Observable.fromEvent(this.IsOnBody ? window : this._containerElement, SCROLL_EVENT).mapTo(SCROLL_EVENT);
    let delayedScrollEvts = scrollEvts.delay(RESIZE_AFTER_SCROLL_BUFFER_MS);
    let resizeEvts = Observable.fromEvent(window, RESIZE_EVENT).mapTo(RESIZE_EVENT);
    let scrollAndResizeEvts = scrollEvts.merge(resizeEvts);

    // in case of zoom event, scroll event is immidiatelly followed by resize event. In such case, we dismiss the original scroll
    // event
    let filteredScrollEvts = scrollEvts
      .map(() => scrollAndResizeEvts.takeUntil(delayedScrollEvts).every( event => event !== RESIZE_EVENT))
      .mergeAll()
      .filter(event => event === true);

    this._scrollSubscription = (<any>filteredScrollEvts)
      .debounceTimeWFirst(this._options.debounceScroll)
      .subscribe(this.RefreshIndex);

    this._resizeSubscription = (<any>resizeEvts)
      .debounceTimeWFirst(this._options.debounceResize)
      .subscribe(this._onWindowResize);

    this._initialized = true;
    this._gdfScrollEvents.emit({type: GdfScrollEventType.INITIALIZED, data: true});

    if (index === null) {
      this.RefreshIndex();
    } else {
      this.ScrollTo(index);
    }
  }

  /**
   * Destroys current instace.
   * Deregisters all handlers.
   *
   * @returns {void}
   */
  public Destroy(): void {
    this._initialized = false;
    this._index = null;

    // disable, to remove listeners
    this.DisableKeyboard();
    this.DisableMouse();
    this.DisableSwipe();

    this._resizeSubscription.unsubscribe();
    this._scrollSubscription.unsubscribe();

    this._gdfScrollEvents.emit({type: GdfScrollEventType.DESTROYED, data: true});
  }

  /**
   * Scroll to index.
   * Throws error if index is out of bounds.
   *
   * @param {number} index
   * @param {IGdfScrollAnimation} [animation]
   * @returns {void}
   */
  public ScrollTo(index: number, animation?: IGdfScrollAnimation): void {
    this.assertInitialized();
    if (this._animationInProgress) { return; }

    if (index < 0 || index >= this._pages.length) {
      throw new Error('Invalid index');
    }
    this._animateOffset(this._pagesData[index].scrollTop, animation);
  }

  /**
   * Scroll to next index.
   *
   * If we are above the first page (index=null), we scroll to it, if it is already visible - viewport's bottom
   * is inside first page.
   *
   * @param {IGdfScrollAnimation} [animation]
   * @returns {boolean} If there was next index to scroll to.
   */
  public ScrollNext(animation?: IGdfScrollAnimation): boolean {
    this.assertInitialized();

    if (this.Index === null) {
      let firstPageData = this._pagesData[0];
      let bottomOffset = this.Offset + this._getContainerClientHeight();
      if (
        bottomOffset >= firstPageData.scrollTop
        && bottomOffset < firstPageData.scrollBottom
      ) {
        this.ScrollTo(0, animation);
        return true;
      }
    } else if (this.Index < this._pages.length - 1) {
      this.ScrollTo(this.Index + 1, animation);
      return true;
    }
    return false;
  }

  /**
   * Scroll to previous index.
   *
   * If we are bellow the last page (index=null), we scroll to it, if it is already visible - viewport's top
   * is inside last page.
   *
   * @param {IGdfScrollAnimation} [animation]
   * @returns {bobooleanol} If there was previous index to scroll to.
   */
  public ScrollPrevious(animation?: IGdfScrollAnimation): boolean {
    this.assertInitialized();

    let lastIdx = this._pagesData.length - 1;
    if (this.Index === lastIdx && !this.IsExactIndex) {
      this.ScrollTo(lastIdx, animation);
      return true;
    } else if (this.Index > 0) {
      this.ScrollTo(this.Index - 1, animation);
      return true;
    }
    return false;
  }

  /**
   * ToggleOverflow
   *
   * @param {boole} [forceState] Set to state
   * @returns {void}
   */
  public ToggleOverflow(forceState?: boolean): void {
    if (typeof forceState !== 'undefined') {
      if (forceState) {
        this.EnableOverflow();
      } else {
        this.DisableOverflow();
      }
    } else {
      if (this.OverflowOn) {
        this.DisableOverflow();
      } else {
        this.EnableOverflow();
      }
    }
  }

  /**
   * Disable overflow on container
   *
   * @returns {void}
   */
  public DisableOverflow(): void {
    if (this.OverflowOn !== false ) {
      if (this.IsOnBody) {
        this._lastPosition = this._containerElement.style.position;
        this._lastWidth = this._containerElement.style.width;
        this._renderer.setElementStyle(this._containerElement, 'margin-top', `-${this.Offset}px`);
        this._renderer.setElementStyle(this._containerElement, 'position', 'fixed');
        this._renderer.setElementStyle(this._containerElement, 'width', `100%`);
      } else {
        this._renderer.setElementStyle(this._containerElement, 'overflow-y', 'hidden');
      }
      this._overflowOn = false;
    }
  }

  /**
   * Enable overflow on container
   *
   * @returns {void}
   */
  public EnableOverflow(): void {
    if (this.OverflowOn !== true) {
      if (this.IsOnBody) {
        let offset = this.Offset;

        this._renderer.setElementStyle(this._containerElement, 'position', this._lastPosition);
        this._renderer.setElementStyle(this._containerElement, 'margin-top', `0`);
        this._renderer.setElementStyle(this._containerElement, 'width', this._lastWidth);

        this._overflowOn = true;
        this._animateOffset(offset, ANIMATION_NONE);
      } else {
        this._renderer.setElementStyle(this._containerElement, 'overflow-y', 'auto');
      }
      this._overflowOn = true;
    }
  }

  /**
   * Pauses all (keyboard/mouse/swipe) interactions. Interactions are actions, to which GdfScroll would
   * react with scroll up or down.
   *
   * If includeSystem is true, we catch and void also system inteactions, that would result in
   * scrolling (keyboard (PgUp/PgDown/ArrowUp/ArrowDown) / mouse wheel / swipe)
   *
   * Enabled/disabled state of each interaction is preserved.
   *
   * @param {boolean} includeSystem description
   * @returns {void}
   */
  public PauseInteractions(includeSystem: boolean = false): void {
    this._pauseSystemInteractions = includeSystem;
    // we use ScrollPagePx to disable interactions - if set to 0, all interaction are disabled.
    this._prepausedScrollPagePx = this.ScrollPagePx;
    this.ScrollPagePx = 0;
  }


  /**
   * Unpauses all (keyboard/mouse/swipe) interactions. Enabled/disabled state of each interaction is preserved.
   *
   * @returns {void}
   */
   public UnpauseInteractions(): void {
    this._pauseSystemInteractions = false;
    if (this._prepausedScrollPagePx !== null) {
      this.ScrollPagePx = this._prepausedScrollPagePx;
    }
  }

  /**
   * ToggleKeyboard
   *
   * @param {boole} [forceState] Set to state
   * @returns {void}
   */
  public ToggleKeyboard(forceState?: boolean): void {
    if (typeof forceState !== 'undefined') {
      this._options.keyboardOn = forceState;
    } else {
      this._options.keyboardOn = !this._options.keyboardOn;
    }
    this._refreshKeyboard();
  }

  /**
   * Disable keyboard interaction
   *
   * @returns {void}
   */
  public DisableKeyboard(): void {
    this._options.keyboardOn = false;
    this._refreshKeyboard();
  }

  /**
   * Enable keyboard interaction
   * Keyboard interaction depends on ScrollPage - which has to be enabled
   *
   * @returns {void}
   */
  public EnableKeyboard(): void {
    this._options.keyboardOn = true;
    this._refreshKeyboard();
  }

  /**
   * Updates the keyboard registration state according to internals
   *
   * @returns {void}
   */
  private _refreshKeyboard(): void {
    let currentState = this._keyboardRegistration !== null;
    let shouldState = (this._options.keyboardOn && this.ScrollPageOn) || this._pauseSystemInteractions;

    if (currentState !== shouldState) {
      if (shouldState) {
        if (this.IsOnBody) {
          this._keyboardRegistration = this._renderer.listenGlobal('document', 'keydown', this._keyboardListener);
        } else {
          this._keyboardRegistration = this._renderer.listen(this._containerElement, 'keydown', this._keyboardListener);
        }
      } else {
        this._keyboardRegistration();
        this._keyboardRegistration = null;
      }
    }
  }

  /**
   * Keyboard listener.
   * We listen for PgUp and PgDown keys.
   *
   * @private
   * @returns {void}
   */
  private _keyboardListener = (event: KeyboardEvent): void => {
    if (event.defaultPrevented) {
      return; // Do nothing if the event was already processed
    }

    if (this._pauseSystemInteractions && SCROLL_KEYS.indexOf(event.key)) {
      // if we are pausing system interactions, catch and cancel the event.
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    switch (event.key) {
      case PAGE_DOWN:
      case ARROW_DOWN:
        if (!this.ScrollNext()) {
          return; // Quit when this doesn't handle the key event.
        };
        break;
      case PAGE_UP:
      case ARROW_UP:
        if (!this.ScrollPrevious()) {
          return; // Quit when this doesn't handle the key event.
        };
        break;
      default:
        return; // Quit when this doesn't handle the key event.
    }

    // Cancel the default action to avoid it being handled twice
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * ToggleMouse
   *
   * @param {boole} [forceState] Set to state
   * @returns {void}
   */
  public ToggleMouse(forceState?: boolean): void {
    if (typeof forceState !== 'undefined') {
      this._options.mouseOn = forceState;
    } else {
      this._options.mouseOn = !this._options.mouseOn;
    }
    this._refreshMouse();
  }

  /**
   * Disable mouse wheel interaction
   *
   * @returns {void}
   */
  public DisableMouse(): void {
    this._options.mouseOn = false;
    this._refreshMouse();
  }

  /**
   * Enable mouse interaction
   * Mouse interaction depends on ScrollPage - which has to be enabled
   *
   * @returns {void}
   */
  public EnableMouse(): void {
    this._options.mouseOn = true;
    this._refreshMouse();
  }

  /**
   * Updates the mouse registration state according to internals
   *
   * @returns {void}
   */
  private _refreshMouse(): void {
    let currentState = this._mouseRegistration !== null;
    let shouldState = (this._options.mouseOn && this.ScrollPageOn) || this._pauseSystemInteractions;

    if (currentState !== shouldState) {
      if (shouldState) {
        if (this.IsOnBody) {
          this._mouseRegistration = this._renderer.listenGlobal('document', 'wheel', this._wheelListener);
        } else {
          this._mouseRegistration = this._renderer.listen(this._containerElement, 'wheel', this._wheelListener);
        }
      } else {
        this._mouseRegistration();
        this._mouseRegistration = null;
      }
    }
  }

  /**
   * Wheel listener.
   *
   * @private
   * @returns {void}
   */
  private _wheelListener = (event: WheelEvent): void => {
    if (event.defaultPrevented) {
      return; // Do nothing if the event was already processed
    }

    if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) {
      return; // Do nothing if any of the additional keys is pressed
    }

    if (this._pauseSystemInteractions) {
      // if we are pausing system interactions, catch and cancel the event.
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    let normalizedSpin = normalizeWheel(event);
    if (normalizedSpin > 0) {
      if (!this.ScrollNext()) {
        return; // Quit when this doesn't handle the key event.
      };
    } else {
      if (!this.ScrollPrevious()) {
        return; // Quit when this doesn't handle the key event.
      };
    }

    // Cancel the default action to avoid it being handled twice
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * ToggleSwipe
   *
   * @param {boolean} [forceState] Set to state
   * @returns {void}
   */
  public ToggleSwipe(forceState?: boolean): void {
    if (typeof forceState !== 'undefined') {
      this._options.swipeOn = forceState;
    } else {
      this._options.swipeOn = !this._options.swipeOn;
    }
    this._refreshSwipe();
  }

  /**
   * Disable swipe interaction
   *
   * @returns {void}
   */
  public DisableSwipe(): void {
    this._options.swipeOn = false;
    this._refreshSwipe();
  }

  /**
   * Enable swipe interaction
   * Swipe interaction depends on ScrollPage - which has to be enabled
   * For swipe interaction to work, hammerjs has to be loaded and swipe gesture has to be enabled with DIRECTION_VERTICAL
   * (not by default)
   * Use HammerGestureConfig provider to configure Hammerjs.
   *
   * @returns {void}
   */
  public EnableSwipe(): void {
    this._options.swipeOn = true;
    this._refreshSwipe();
  }

  /**
   * Updates the swipe registration state according to internals
   *
   * @returns {void}
   */
  private _refreshSwipe(): void {
    let currentState = this._swipeRegistrations !== null;
    let shouldState = this._options.swipeOn && this.ScrollPageOn;

    if (currentState !== shouldState) {
      if (shouldState) {
        this._swipeRegistrations = [];
        for (let i = 0, l = this._pages.length; i < l; i++) {
          if (i > 0) {
            this._swipeRegistrations.push(this._renderer.listen(this._pages[i], 'swipedown', this._swipeDownListener));
          }
          if (i < (l - 1)) {
            this._swipeRegistrations.push(this._renderer.listen(this._pages[i], 'swipeup', this._swipeUpListener));
          }
        }
      } else {
        for (let i = 0, l = this._swipeRegistrations.length; i < l; i++) {
          this._swipeRegistrations[i]();
        }
        this._swipeRegistrations = null;
      }
    }
  }

  /**
   * Swipe up listener
   *
   * @private
   * @returns {void}
   */
  private _swipeUpListener = (event): void => {
    if (!this.ScrollNext()) {
      return; // Quit when this doesn't handle the key event.
    };
    // Cancel the default action to avoid it being handled twice
    event.preventDefault();
  }

  /**
   * Swipe down listener
   *
   * @private
   * @returns {void}
   */
  private _swipeDownListener = (event): void => {
    if (!this.ScrollPrevious()) {
      return; // Quit when this doesn't handle the key event.
    };

    // Cancel the default action to avoid it being handled twice
    event.preventDefault();
  }

  /**
   * Window resize listener
   * - refresh offsets and refresh scrollPage property
   * - if resizeStayOnPage, stay on page, else update indexes.
   *
   * @private
   * @returns {void}
   */
  private _onWindowResize = (): void => {
    if (!this.RefreshOffsets()) {
      // refresh scroll page even if pages data didn't change (if data changed, _refreshScrollPage has been already called)
      this._refreshScrollPage();
    };
    if (this._options.resizeStayOnPage && this.Index !== null && !this.IsExactIndex) {
      this.ScrollTo(this.Index, ANIMATION_NONE);
    } else {
      this.RefreshIndex();
    }
  }

  /**
   * Refreshes curent index and exactindex, according to current offset and recognizePagePx option.
   *
   * @returns {void}
   */
  public RefreshIndex = (): void => {
    this._setIndex(this.getIndexFromOffset());
    this._refreshExactIndex();
  }

  /**
   * Update ScrollPage.
   *
   * @private
   * @return {void}
   */
  private _refreshScrollPage(): void {
    if (this.ScrollPagePx === -1) {
      this.scrollPageOn = (this._getContainerClientHeight() >= this._maxPageHeight);
    } else if (this.ScrollPagePx === 0) {
      this.scrollPageOn = false;
    } else if (this.ScrollPagePx > 0) {
      this.scrollPageOn = (this._getContainerClientHeight() > this.ScrollPagePx);
    } else {
      throw new Error('Wrong value for ScrollPagePx!');
    }
  }

  /**
   * Container viewport height
   *
   * @private
   * @return {number}
   */
  private _getContainerClientHeight(): number {
    if (this.IsOnBody) {
      return window.innerHeight;
    } else {
      return this._containerElement.clientHeight;
    }
  }

  /**
   * Container scroll height
   *
   * @private
   * @return {number}
   */
  private _getContainerScrollHeight(): number {
    if (this.IsOnBody) {
      return window.document.body.scrollHeight;
    } else {
      return this._containerElement.scrollHeight;
    }
  }

  /**
   * Returns pages elements
   *
   * @protected
   * @returns {Array<HTMLElement>}
   */
  protected abstract getPages(): HTMLElement[];

  /**
   * Fetches page elements and compares with current.
   * If changed, updates them and calls recalculate offsets.
   *
   * @returns {boolean} True, if page have been changed
   */
  public RefreshPages(): boolean {
    let pages = this.getPages();

    // have pages changed?
    if (pages.length === this._pages.length) {
      let pagesChanged = false;
      for (let i = 0, l = pages.length; i < l; i++) {
        if (pages[i] !== this._pages[i]) {
          pagesChanged = true;
          break;
        }
      }
      if (!pagesChanged) {
        return false;
      }
    }

    this._pages = pages;

    let originalScrollPage = this.ScrollPageOn;
    this.RefreshOffsets();

    if (originalScrollPage === this.ScrollPageOn && this.SwipeActive) {
      // scroll page didn't change (which would mean, that de/register already happend) and Swipe is on
      // we have to reregister swipe listeners, because of changed pages.
      this.DisableSwipe();
      this.EnableSwipe();
    }
    return true;
  }

  /**
   * @deprecated Use RefreshOffsets()
   * @see RefreshOffsets
   * @returns {boolean} True, if page data has changed
   */
  public RecalculateOffsets(): boolean {
    return this.RefreshOffsets();
  }

  /**
   * Refreshes page data - offsets.
   *
   * If data has changed, refresh ScrollPage
   *
   * @returns {boolean} True, if page data has changed
   */
  public RefreshOffsets(): boolean {

    let baseElementOffset = this.IsOnBody ? 0 : this.getElementsTop(this._containerElement) - this.Offset;

    let offsets: IPageData[] = [];
    this._maxPageHeight = 0;
    let l = this._pages.length;

    if (l > 0) {
      let i = 0;
      for (; i < l; i++) {
        let pageData: IPageData = {
          scrollTop: this.getElementsTop(this._pages[i]) - baseElementOffset,
          scrollHeight: this._pages[i].offsetHeight,
          scrollBottom: 0
        };
        pageData.scrollBottom = pageData.scrollTop + pageData.scrollHeight;
        offsets.push(pageData);

        // update _maxPageHeight
        if (pageData.scrollHeight > this._maxPageHeight) {
            this._maxPageHeight = pageData.scrollHeight;
        }
      }
    }

    // any change at all?
    if (this._pagesData.length === offsets.length) {
      let changedOffsets = false;
      for (let i = 0; i < l; i++) {
        if (offsets[i].scrollTop !== this._pagesData[i].scrollTop ||
          offsets[i].scrollHeight !== this._pagesData[i].scrollHeight
        ) {
          changedOffsets = true;
          break;
        }
      }
      if (!changedOffsets) {
        // no changes!
        return false;
      }
    }
    this._pagesData = offsets;
    this._refreshScrollPage();
    return true;
  }

  /**
   * Returns calculated index from current offset.
   * It considers recognizePagePx option. and 1px tolerance
   *
   * @private
   * @returns {number}
   */
  private getIndexFromOffset(): number {

    let off = this._options.recognizePagePx >= 0 ? this._options.recognizePagePx : this._getContainerClientHeight() / 2;
    off += this.Offset;

    for (let i = 0, l = this._pages.length; i < l; i++) {
      // allow for 1px delta, because scrollTop is float and sometimes doesn't scroll to the int given.
      if (off > (this._pagesData[i].scrollTop - 1) && off < (this._pagesData[i].scrollBottom - 1)) {
        return i;
      }
    }
    return null;
  }

  /**
   * Returns elements top relative to complete document.
   *
   * @private
   * @param {HTMLElement} element
   * @returns {number}
   */
  private getElementsTop(element: HTMLElement): number { // crossbrowser version
    let box = element.getBoundingClientRect();
    let body = this._document.body;
    let docEl = this._document.documentElement;

    let scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;

    let clientTop = docEl.clientTop || body.clientTop || 0;

    let top  = box.top + scrollTop - clientTop;

    return Math.round(top);
  }

  /**
   * @private
   * @returns {void}
   */
  private assertInitialized(): void {
    if (!this.Initialized) {
      throw new Error('Invalid action. Please initialized GdfScroll first!');
    }
  }
}

/**
 * Returns easing function
 *
 * @param {GdfScrollEasingFunction} easing
 * @returns {IGdfScrollEasingFunction}
 */
function  _getEasingFunc(easing: GdfScrollEasingFunction): IGdfScrollEasingFunction {
  let easingFunction;

  switch (easing) {
    case GdfScrollEasingFunction.LINEAR:
      // no easing, no acceleration
      easingFunction = (t) => t;
      break;
    case GdfScrollEasingFunction.IN_QUAD:
      // quad accelerating from zero velocity
      easingFunction = (t) => t * t;
      break;
    case GdfScrollEasingFunction.OUT_QUAD:
      // quad decelerating to zero velocity
      easingFunction = (t) => t * (2 - t);
      break;
    case GdfScrollEasingFunction.INOUT_QUAD:
      // quad acceleration until halfway, then quad deceleration
      easingFunction = (t) => t < .5 ? 2 * t * t : -1 + (4 - 2 * t ) * t;
      break;
    case GdfScrollEasingFunction.IN_CUBIC:
      // cubic accelerating from zero velocity
      easingFunction = (t) => t * t * t;
      break;
    case GdfScrollEasingFunction.OUT_CUBIC:
      // cubic decelerating to zero velocity
      easingFunction = (t) => (--t) * t * t + 1;
      break;
    case GdfScrollEasingFunction.INOUT_CUBIC:
      // cubic acceleration until halfway, then cubic deceleration
      easingFunction = (t) => t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      break;
    case GdfScrollEasingFunction.IN_QUART:
      // quart accelerating from zero velocity
      easingFunction = (t) => t * t * t * t;
      break;
    case GdfScrollEasingFunction.OUT_QUART:
      // quart decelerating to zero velocity
      easingFunction = (t) => 1 - (--t) * t * t * t;
      break;
    case GdfScrollEasingFunction.INOUT_QUART:
      // quart acceleration until halfway, then quart deceleration
      easingFunction = (t) => t < .5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
      break;
    case GdfScrollEasingFunction.IN_QUINT:
      // quint accelerating from zero velocity
      easingFunction = (t) => t * t * t * t * t;
      break;
    case GdfScrollEasingFunction.OUT_QUINT:
      // quint decelerating to zero velocity
      easingFunction = (t) => 1 + (--t) * t * t * t * t;
      break;
    case GdfScrollEasingFunction.INOUT_QUINT:
      // quint acceleration until halfway, then quint deceleration
      easingFunction = (t) => t < .5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t;
      break;
  }
  return easingFunction;
}

/**
 * Normalizes mouse wheel event.
 *
 * @param {object} Event
 * @returns {number} normalized y-spin
 */
function normalizeWheel(event: any): any {
  let sY = 0, pY = 0;

  const PIXEL_STEP  = 10;
  const LINE_HEIGHT = 40;
  const PAGE_HEIGHT = 800;

  if ('detail'      in event) { sY = event.detail; }
  if ('wheelDelta'  in event) { sY = -event.wheelDelta / 120; }
  if ('wheelDeltaY' in event) { sY = -event.wheelDeltaY / 120; }

  // side scrolling on FF with DOMMouseScroll
  if ( 'axis' in event && event.axis === event.HORIZONTAL_AXIS ) {
    sY = 0;
  }

  pY = sY * PIXEL_STEP;

  if ('deltaY' in event) { pY = event.deltaY; }

  if ((pY) && event.deltaMode) {
    if (event.deltaMode === 1) {          // delta in LINE units
      pY *= LINE_HEIGHT;
    } else {                             // delta in PAGE units
      pY *= PAGE_HEIGHT;
    }
  }

  // Fall-back if spin cannot be determined
  if (pY && !sY) { sY = (pY < 1) ? -1 : 1; }

  return sY;
}
