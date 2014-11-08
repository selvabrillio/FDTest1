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
var utils = require('../../lib/util/utils');

var CLITest = require('../framework/cli-test');

var storageNamesPrefix = 'xcliaccount';
var storageNames = [];

var AFFINITYGROUP_NAME_PREFIX = 'xcliaffinity';
var storageLocation;
var siteLocation;

var createdAffinityGroups = [];

var requiredEnvironment = [
  { name: 'AZURE_STORAGE_TEST_LOCATION', defaultValue: 'West Europe' },
  { name: 'AZURE_SITE_TEST_LOCATION', defaultValue: 'West Europe' }
];

var suite;
var testPrefix = 'cli.storage.account-tests';

describe('cli', function () {
  describe('storage account', function () {
    var storageName;
    var affinityGroupName;
    var primaryKey;

    before(function (done) {
      suite = new CLITest(testPrefix, requiredEnvironment);

      if (suite.isMocked) {
        utils.POLL_REQUEST_INTERVAL = 0;
      }

      suite.setupSuite(done);
    });

    after(function (done) {
      if (!suite.isMocked || suite.isRecording) {
        suite.forEachName(storageNames, 'storage account delete %s --json -q', function () {
          suite.forEachName(createdAffinityGroups, 'account affinity-group delete %s --json -q', function () {
            suite.teardownSuite(done);
          });
        });
      } else {
        suite.teardownSuite(done);
      }
    });

    beforeEach(function (done) {
      suite.setupTest(function () {
        storageLocation = process.env.AZURE_STORAGE_TEST_LOCATION;
        siteLocation = process.env.AZURE_SITE_TEST_LOCATION;
        done();
      });
    });

    afterEach(function (done) {
      suite.teardownTest(done);
    });

    it('should create a storage account with location', function(done) {
      storageName = suite.generateId(storageNamesPrefix, storageNames);

      suite.execute('storage account create %s --json --location %s',
        storageName,
        storageLocation,
        function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        done();
      });
    });

    it('should create a storage account with affinity group', function(done) {
      storageName = suite.generateId(storageNamesPrefix, storageNames);
      affinityGroupName = suite.generateId(AFFINITYGROUP_NAME_PREFIX, createdAffinityGroups);

      suite.execute('account affinity-group create %s --location %s --description XplatCliTestArtifact --json',
        affinityGroupName,
        siteLocation,
        function (result) {

        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        suite.execute('storage account create %s --json -a %s',
          storageName,
          affinityGroupName,
          function (result) {
          result.text.should.equal('');
          result.exitStatus.should.equal(0);

          done();
        });
      });
    });

    it('should list storage accounts', function(done) {
      suite.execute('storage account list --json', function (result) {
        var storageAccounts = JSON.parse(result.text);
        storageAccounts.some(function (account) {
          return account.name === storageName;
        }).should.be.true;

        done();
      });
    });

    it('should update storage accounts', function(done) {
      suite.execute('storage account set %s --label test --json', storageName, function (result) {
        result.text.should.equal('');
        result.exitStatus.should.equal(0);

        suite.execute('storage account show %s --json', storageName, function (result) {
          var storageAccount = JSON.parse(result.text);
          storageAccount.properties.label.should.equal('test');

          done();
        });
      });
    });

    it('should renew storage keys', function(done) {
      suite.execute('storage account keys list %s --json', storageName, function (result) {
        var storageAccountKeys = JSON.parse(result.text);
        storageAccountKeys.primaryKey.should.not.be.null;
        storageAccountKeys.secondaryKey.should.not.be.null;

        suite.execute('storage account keys renew %s --primary --json', storageName, function (result) {
          result.exitStatus.should.equal(0);

          storageAccountKeys = JSON.parse(result.text);
          storageAccountKeys.primaryKey.should.not.be.null;
          primaryKey = storageAccountKeys.primaryKey;
          storageAccountKeys.secondaryKey.should.not.be.null;
          done();
        });
      });
    });
    
    it('should show connecting string', function(done) {
      suite.execute('storage account connectionstring show %s --json', storageName, function(result) {
        var connectionString = JSON.parse(result.text);
        var desiredConnectionString = 'DefaultEndpointsProtocol=https;AccountName=' + storageName + ';AccountKey=' + primaryKey;
        connectionString.string.should.equal(desiredConnectionString);
        result.exitStatus.should.equal(0);
        done();
      });
    });
    
    it('should show connecting string with endpoints', function (done) {
      suite.execute('storage account connectionstring show --use-http --blob-endpoint myBlob.ep --queue-endpoint 10.0.0.10 --table-endpoint mytable.core.windows.net %s --json', storageName, function(result) {
        var connectionString = JSON.parse(result.text);
        var desiredConnectionString = 'DefaultEndpointsProtocol=http;BlobEndpoint=myBlob.ep;QueueEndpoint=10.0.0.10;TableEndpoint=mytable.core.windows.net;AccountName='+ storageName + ';AccountKey=' + primaryKey;
        connectionString.string.should.equal(desiredConnectionString);
        result.exitStatus.should.equal(0);
        done();
      });
    });
  });
});