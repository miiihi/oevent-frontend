export interface ICat {
  id: number;
  name: string;
  items: Array<any>;
}

export interface IEventGroup {
  i: number;        // index of group
  d: string;        // string of comma separated evendIdx
  ids: Array<string>; // array of eventIdx
}

export interface ICol {
  idx: number;
  cats: Array<ICat>;
  event: IEventGroup;
}
