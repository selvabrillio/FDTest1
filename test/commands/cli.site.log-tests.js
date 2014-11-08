//
// Copyright (c) Microsoft and contributors.  All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

var should = require('should');

var CLITest = require('../framework/cli-test');

var gitUsername;
var location;
var suite;
var testPrefix = 'cli.site.log-tests';

var siteNamePrefix = 'clitests';
var siteNames = [];

var requiredEnvironment = [
  'AZURE_GIT_USERNAME',
  {
    name: 'AZURE_SITE_TEST_LOCATION',
    defaultValue: 'East US'
  }
];

describe('cli', function () {
  describe('site log', function () {
    var createdSites = [];

    before(function (done) {
      suite = new CLITest(testPrefix, requiredEnvironment);
      suite.setupSuite(done);
    });

    after(function (done) {
      suite.teardownSuite(done);
    });

    beforeEach(function (done) {
      suite.setupTest(function () {
        gitUsername = process.env.AZURE_GIT_USERNAME;
        location = process.env.AZURE_SITE_TEST_LOCATION;
        done();
      });
    });

    afterEach(function (done) {
      suite.forEachName(createdSites, deleteSite, function () {
        createdSites = [];
        suite.teardownTest(done);
      });
    });

    describe('config', function () {
      var siteName;

      beforeEach(function (done) {
        siteName = suite.generateId(siteNamePrefix, siteNames);
        createSite(siteName, done);
      });

      it('should allow setting everything', function (done) {
        suite.execute('site log set %s --application -o file -l error --web-server-logging --detailed-error-messages --failed-request-tracing --json',
          siteName,
          function (result) {

          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          showSite(siteName, function (result) {
            result.exitStatus.should.equal(0);

            var site = JSON.parse(result.text);

            site.diagnosticsSettings.AzureDriveEnabled.should.equal(true);
            site.diagnosticsSettings.AzureDriveTraceLevel.should.equal('Error');

            site.config.requestTracingEnabled.should.equal(true);
            site.config.httpLoggingEnabled.should.equal(true);
            site.config.detailedErrorLoggingEnabled.should.equal(true);

            done();
          });
        });
      });

      it('should allow disabling everything', function (done) {
        suite.execute('site log set %s --disable-application -o file --disable-web-server-logging --disable-detailed-error-messages --disable-failed-request-tracing --json',
          siteName,
          function (result) {

          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          showSite(siteName, function (result) {
            result.exitStatus.should.equal(0);

            var site = JSON.parse(result.text);

            site.diagnosticsSettings.AzureDriveEnabled.should.equal(false);

            site.config.requestTracingEnabled.should.equal(false);
            site.config.httpLoggingEnabled.should.equal(false);
            site.config.detailedErrorLoggingEnabled.should.equal(false);

            done();
          });
        });
      });
    });

    function createSite(siteName, callback) {
      suite.execute('node cli.js site create %s --git --gitusername %s --json --location %s', siteName, gitUsername, location, function () {
        createdSites.push(siteName);
        callback();
      });
    }

    function showSite(siteName, callback) {
      suite.execute('node cli.js site show %s --json', siteName, callback);
    }

    function deleteSite(siteName, callback) {
      suite.execute('node cli.js site delete %s --json --quiet', siteName, callback);
    }
  });
});