import { browser, by, element } from 'protractor';
import { HomePage } from './homepage.po';

const lojID = 'DQ0B7Y';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000;

describe('configurator App', () => {
  let page: HomePage;

  beforeEach(() => {
    page = new HomePage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getTitle()).toEqual(<any>'GDF Seed');
  });
});
