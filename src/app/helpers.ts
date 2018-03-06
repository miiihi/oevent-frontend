import { ICat, ICol, IEventGroup } from './interfaces';
import * as fnsFormat from 'date-fns/format';
import * as fnsAddMs from 'date-fns/add_milliseconds';
import { environment } from '../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import 'rxjs/add/observable/interval';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/from';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/do';

const FINISH_TYPES = {
  1: 'ok',
  2: 'disq',
  3: 'dnf',
  4: 'dns',
  5: 'mp'
};

const RESULTS = environment.baseUrl + 'api/results?event=';
const STARTS = environment.baseUrl + 'api/startlist?event=';
const CATEGORIES = environment.baseUrl + 'api/category';
const CLUBS = environment.baseUrl +  'api/club';

const RELOAD = 1000; // ms

export enum SubTypeEnum {
  START,
  RESULT
}

export function getSubscription(_http: HttpClient, type: SubTypeEnum,
  data: {_allClubs: any, _allCategories: any, _stopedCats: any, eventGroups: Array<IEventGroup>, dataCols: ICol[]  }) {

  let data_apiUrl, itemFn;
  switch (type) {
    case SubTypeEnum.RESULT:
      data_apiUrl = RESULTS;
      itemFn = PrepareItemResult;
      break;

    case SubTypeEnum.START:
      data_apiUrl = STARTS;
      itemFn = PrepareItemStart;
      break;
  }

  return _http.get(CLUBS, { responseType: 'json'})
    .map((res) => {
      (<any>res).data.forEach( club => {
        data._allClubs[club.ID] = club;
      });
    })
    .switchMap(() => _http.get(CATEGORIES, { responseType: 'json'}))
    .switchMap( res => {
      (<any>res).data.forEach( cat => {
        data._allCategories[cat.ID] = cat;
      });

      // reset columns
      data.dataCols = [];
      environment.columnDefinitions.forEach( (v, i) => {
        const col: ICol = { idx: i, cats: [], event: getEventForCol(i, data.eventGroups) };
        v.forEach( catId => {
          col.cats.push({ id: catId, name: data._allCategories[catId].CATEGORYNAME, items: []});
        });
        data.dataCols.push(col);
      });

      return Observable.interval(RELOAD);
    })
    .switchMap(() => {
      return Observable.from(data.eventGroups);
    })
    .do((eventGroup) => {
      _http.get(data_apiUrl + eventGroup.d)
      .subscribe( res => {
        let catId = null;
        let cat: ICat = null;

        // results are sorted by cat.
        (<any>res).data.forEach((r, idx) => {
          if (catId !== r.CATEGORYID) {
            cat = getCat(r.CATEGORYID, eventGroup.i, data.dataCols, data._stopedCats,
              environment.columnDefinitions.length / data.eventGroups.length );
            catId = r.CATEGORYID;
            // reset the category
            if (cat) {
              cat.items = [];
            }
          }
          if (cat) {
            if (r.CLUBID && data._allClubs[r.CLUBID]) {
              r.CLUB_SHORTNAME = '(' + data._allClubs[r.CLUBID].SHORTNAME + ')';
            }
            cat.items.push(r);
            itemFn(cat.items.length - 1, cat.items, eventGroup.ids);

            // console.log(r);
          }
        });
      });
    });
}

export function PrepareItemResult(idx, items: Array<any>, eventIds: Array<string>) {
  const item = items[idx];

  // set failed
  item.failed = !(item.empty || eventIds.every(evId => item['FINISHTYPE' + evId] === 1));

  item.time = getTime(item, eventIds, true);

  item.pos = null;
  if (!item.empty && !item.failed) {
    item.pos = getPosition(idx, items, true, eventIds);
  }
}

export function PrepareItemStart(idx, items: Array<any>, eventIds: Array<string>) {
  const item = items[idx];

  // set failed
  item.failed = false;

  item.time = getStart(item, eventIds[0], environment.firstStart);

  item.pos = getPosition(idx, items, false, eventIds);
}

function getStart(item: any, eventId: string, firstStart: Date) {
  if (item.empty) {
    // no result, no time
    return;
  }

  const start = fnsAddMs(firstStart, item['STARTTIME' + eventId] * 10);

  let retStr = fnsFormat(start, 'H:mm:ss');
  if (retStr.substr(0, 2) === '0:') {
    retStr = retStr.substr(2);
  }
  return retStr;
}

function getTime(item: any, eventIds: Array<string>, withError = false) {
  if (item.empty) {
    // no result, no time
    return;
  }

  if (item.failed) {
    if (withError) {
      return FINISH_TYPES[item['FINISHTYPE' + eventIds[0]]];
    }
    return;
  }

  let total = 0;
  eventIds.forEach(evId => {
    total += item['COMPETITIONTIME' + evId];
  });

  let retStr = fnsFormat(new Date(0, 0, 0, 0, 0, 0, total * 10), 'H:mm:ss');
  if (retStr.substr(0, 2) === '0:') {
    retStr = retStr.substr(2);
  }
  return retStr;
}

function getPosition(idx, items: Array<any>, compareTime = false, eventIds: Array<string>) {
  if (items[idx].empty || items[idx].failed) {
    // no results is valid
    return;
  }

  if (idx === 0) {
    return '1';
  } else if (compareTime &&  getTime(items[idx], eventIds) === getTime(items[idx - 1], eventIds)) {
    return getPosition(idx - 1, items, compareTime, eventIds);
  }
  return (idx + 1).toString();
}

function getCat(catId, eventGroupIdx, dataCols, stopedCats, colPerEventGroup): ICat {
  // find cat id colIdx and catIdx
  for (let i = eventGroupIdx * colPerEventGroup; i < (eventGroupIdx + 1) * colPerEventGroup; i++) {
    const col = dataCols[i];
    const r = col.cats.find(cat => cat.id === catId);

    if (typeof r !== 'undefined' && stopedCats[i].indexOf(catId) === -1 ) {
      return r;
    }
  }
  return null;
}

function getEventForCol(colIdx, eventGroups: Array<IEventGroup>): IEventGroup {
  const idx = Math.floor((colIdx) / (environment.columnDefinitions.length / eventGroups.length));
  return eventGroups[idx];
}
