import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs/Subscription';
import { environment } from '../../environments/environment';
import { ICat, ICol, IEventGroup } from '../interfaces';

import { getSubscription, SubTypeEnum } from '../helpers';

@Component({
  templateUrl: 'start.component.html',
})
export class StartComponent implements OnInit, OnDestroy {

  data: {
    _allClubs: any,
    _allCategories: any,
    _stopedCats: any,
    eventGroups: Array<IEventGroup>,
    dataCols: ICol[]
  } =  {
    _allClubs: {},
    _allCategories: {},
    _stopedCats: { 0: [], 1: [], 2: [], 3: []},
    eventGroups: [],
    dataCols: []
  };

  private _subscription: Subscription = null;

  constructor(private _http: HttpClient, private _route: ActivatedRoute) { }

  ngOnInit() {

    this._route.params
      .subscribe((params: Params) => {
        if (this._subscription !== null) {
          this._subscription.unsubscribe();
        }

        const eventId1 = params['eventId1'] ? params['eventId1'] : '1';
        this.data.eventGroups.push({ i: 0, d: eventId1, ids: eventId1.split(',')});
        if (params['eventId2']) {
          const eventId2 = params['eventId2'];
          this.data.eventGroups.push({ i: 0, d: eventId2, ids: eventId2.split(',')});
        }

        this._subscription = getSubscription(
          this._http,
          SubTypeEnum.START, this.data)
        .subscribe();
      });
  }

  stopCat(catId, colIdx) {
    this.data._stopedCats[colIdx].push(catId);
  }

  startCat(catId, colIdx) {
    const index = this.data._stopedCats[colIdx].indexOf(catId);
    if (index > -1) {
      this.data._stopedCats[colIdx].splice(index, 1);
    }
  }

  ngOnDestroy() {
    if (this._subscription !== null) {
      this._subscription.unsubscribe();
    }
  }
}
