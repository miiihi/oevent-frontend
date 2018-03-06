// Protractor configuration file, see link for more information
// https://github.com/angular/protractor/blob/master/lib/config.ts

const fse = require('fs-extra');
const path = require('path');
const { SpecReporter } = require('jasmine-spec-reporter');
const { JUnitXmlReporter } = require('jasmine-reporters');
const jasmineHtmlReporter = require('protractor-jasmine2-html-reporter');

/**
 * These environment vars have to be set on jenkins
 */
const isJenkins = process.env.IS_JENKINS;
const baseUrl = process.env.E2E_BASE_URL || 'http://localhost:4200/';
const seleniumAddress = process.env.E2E_SELENIUM_ADDRESS;
const resultPath = './test_results/e2e';
const bsKey ='LtKw12q9Nhg2UxBpTR6V';

/**
 * HAS TO BE IN SYNC WITH ACTUAL CSS BREAKPOINTS!
 */
const tabletBreakpoint = 769;
const desktopBreakpoint = 1025;
const widescreenBreakpoint = 1180;

const WIDTH_TOLERANCE = 1;  // cause it is not always possible to set the exact pixel width

exports.config = {
  allScriptsTimeout: 11000,
  directConnect: !isJenkins,
  specs: [
    './e2e/**/*.e2e-spec.ts'
  ],

  'commonCapabilities': {
    'build': 'protractor-browserstack',
    'name': 'parallel_local_test',
    'browserstack.debug': 'true'
  },

  multiCapabilities: [
  {
    'browserName': 'chrome',
    'maxInstances': 1,
    'name': 'chrome_desktop',
    'width': desktopBreakpoint + WIDTH_TOLERANCE,
    'height': 1200
  },
  {
    'browserName': 'chrome',
    'maxInstances': 1,
    'name': 'ff_desktop',
    'width': desktopBreakpoint + WIDTH_TOLERANCE,
    'height': 1200
  }],
  seleniumAddress: seleniumAddress,
  webDriverProxy: 'http://surf.proxy.agis.allianz:8080',
  baseUrl: baseUrl,
  framework: 'jasmine2',
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 30000,
    print: function() {}
  },
  beforeLaunch: function() {
    // do the cleanup
    try {
      fse.removeSync(path.resolve(__dirname, resultPath));
     } catch (e) {}
  },
  // Code to stop browserstack local after end of test
  afterLaunch: function(){
  },
  onPrepare() {
    jasmine.getEnv().addReporter(new SpecReporter());
    require('ts-node').register({
      project: 'e2e/tsconfig.e2e.json'
    });
    return browser.getProcessedConfig().then(function(config) {
      var capabilities = config.capabilities;

      return setViewportSize(capabilities.width, capabilities.height).then(viewportSize => {
        jasmine.getEnv().addReporter(
          new JUnitXmlReporter({
            consolidateAll: true,
            savePath: path.resolve(__dirname, resultPath),
            filePrefix:  `report_${capabilities.browserName}_${capabilities.name}_${viewportSize.width}_${viewportSize.height}`,
            modifySuiteName: function(generatedSuiteName, suite) {
              return `${capabilities.browserName} (${viewportSize.width}x${viewportSize.height}) ${generatedSuiteName}`;
            }
          })
        );
        jasmine.getEnv().addReporter(
          new jasmineHtmlReporter({
            consolidateAll: true,
            cleanDestination: false,
            savePath: path.resolve(__dirname, resultPath),
            fileName: `${capabilities.browserName}_${capabilities.name}_${viewportSize.width}_${viewportSize.height}`
          })
       );
      });
    });
  }
};

const MAX_TRIES = 5;

function setViewportSize(width, height, n = 0, wErr = 0, hErr = 0) {
  return browser.driver.manage().window().getSize().then((windowSize) => {
    return getWindowInnerSize().then((viewportSize) => {
      let wDiff = windowSize.width - viewportSize.width;
      let hDiff = windowSize.height - viewportSize.height;
      return _setViewportSize(width + wDiff, height + hDiff, width, height);
    });
  });
}

function _setViewportSize(width, height, desiredWidth, desiredHeight, n = 0) {
  return browser.manage().window().setSize(width, height)
    .then(() => getWindowInnerSize())
    .then( result => {
      let wErr = result.width - desiredWidth;
      let hErr = result.height - desiredHeight;
      if (n < MAX_TRIES && (result.width !== desiredWidth || result.height !== desiredHeight)) {
          return _setViewportSize(width - wErr, height - hErr, desiredWidth, desiredHeight, ++n);
      } else {
        return result;
      }
    });
}

const JS_GET_INNER_SIZE = "return { width: window.innerWidth, height: window.innerHeight };";
function getWindowInnerSize() {
  return browser.executeScript(JS_GET_INNER_SIZE)
}

// Code to support common capabilities
exports.config.multiCapabilities.forEach(function(caps){
  for(var i in exports.config.commonCapabilities) caps[i] = caps[i] || exports.config.commonCapabilities[i];
});
