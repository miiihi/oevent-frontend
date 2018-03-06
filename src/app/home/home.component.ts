import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

const CATEGORIES = environment.baseUrl + 'api/category';

@Component({
  templateUrl: 'home.component.html'
})
export class HomeComponent {
  data: any;

  constructor(private _http: HttpClient) {
    this._http.get(CATEGORIES, { responseType: 'json'}).subscribe(res => {
      this.data = (<any>res).data;
    });
  }
}
