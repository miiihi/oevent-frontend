import { Observable } from 'rxjs/Observable';
import { Subscriber } from 'rxjs/Subscriber';
import { Subscription } from 'rxjs/Subscription';
import { async } from 'rxjs/scheduler/async';
import { Scheduler } from 'rxjs/Scheduler';


/**
 * A custom observable operator that combines logic from throttle and debounce.
 *
 * It emits first value from source then starts debouncing - it emits next value from
 * the source Observable only after a particular time span has passed without another source emission.
 *
 * After emiting debounced value, it waits for another time span, before emiting next value if received 
 * or repeating the process from beginning.
 *
 * As there is no simple and elegant way of extending the Observable class in TS with additional operator
 * we have to extend the prototype.
 */
(<any>Observable.prototype).debounceTimeWFirst = function debounceTimeWFirst(dueTime, scheduler = async) {
  return this.lift(new DebounceTimeWFirstOperator(dueTime, scheduler));
};

class DebounceTimeWFirstOperator {
  private dueTime;
  private scheduler;

  constructor(dueTime, scheduler) {
    this.dueTime = dueTime;
    this.scheduler = scheduler;
  }
  call(subscriber, source) {
    return source.subscribe(new DebounceTimeWFirstSubscriber(subscriber, this.dueTime, this.scheduler));
  }
}

class DebounceTimeWFirstSubscriber<T> extends Subscriber<T> {
  private dueTime: number;
  private scheduler: Scheduler;
  private debouncedSubscription: Subscription = null;
  private lastValue: any;
  private hasValue: boolean;

  constructor(destination: Subscriber<T>, dueTime: number, scheduler = async) {
    super(destination);
    this.dueTime = dueTime;
    this.scheduler = scheduler;
    this.lastValue = null;
    this.hasValue = false;
  }
  _next(value) {
    if (this.debouncedSubscription !== null) {
      this.destination.next(this.lastValue);
    } else {
      this.clearDebounce();
      this.lastValue = value;
      this.hasValue = true;
    }
    this.add(this.debouncedSubscription = this.scheduler.schedule(dispatchNext, this.dueTime, this));
  }
  _complete() {
    this.debouncedNext();
    this.destination.complete();
  }
  debouncedNext() {
    this.clearDebounce();
    if (this.hasValue) {
      this.destination.next(this.lastValue);
      this.lastValue = null;
      this.hasValue = false;
      this.add(this.debouncedSubscription = this.scheduler.schedule(dispatchNext, this.dueTime, this));
    }
  }
  clearDebounce() {
    const debouncedSubscription = this.debouncedSubscription;
    if (debouncedSubscription !== null) {
      this.remove(debouncedSubscription);
      debouncedSubscription.unsubscribe();
      this.debouncedSubscription = null;
    }
  }
}
function dispatchNext(subscriber) {
  subscriber.debouncedNext();
}
