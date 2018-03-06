import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, Params } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs/Observable';
import { PrepareItemResult} from '../helpers';

const CATEGORIES = environment.baseUrl + 'api/category/';
const RESULT_SUFFIX = '/results?event=1';
const RELOAD = 5000;

@Component({
  templateUrl: 'results.component.html'
})
export class ResultComponent implements OnInit {
  data: any;

  constructor(private _http: HttpClient, private _route: ActivatedRoute) {}

  ngOnInit() {
    this._route.params
    .subscribe((params: Params) => {
      Observable
        .interval(RELOAD)
        .do(() => {
          this._http.get(CATEGORIES + params['catId'] + RESULT_SUFFIX, {responseType: 'json'}).subscribe(res => {
            this.data = (<any>res).data;
            this.data.forEach((element, idx) => {
              PrepareItemResult(idx, this.data, ['1']);
            });
          });
        })
        .subscribe();
    });
  }
}
