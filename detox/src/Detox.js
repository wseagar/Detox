const _ = require('lodash');
const uuid = require('./utils/uuid');
const getFreePort = require('get-port');
const util = require('util');
const log = require('./utils/logger').child({ __filename });
const Device = require('./devices/Device');
const drivers = require('./devices/drivers');
const DetoxRuntimeError = require('./errors/DetoxRuntimeError');
const Client = require('./client/Client');
const DetoxServer = require('./server/DetoxServer');
const ArtifactsManager = require('./artifacts/ArtifactsManager');


class Detox {
  /***
   * @param config
   * @param {String} config.app.binaryPath
   * @param {String} [config.app.testBinaryPath]
   * @param {Boolean} config.behavior.cleanup
   * @param {Boolean} config.behavior.reuse
   * @param {Boolean} config.behavior.initGlobals
   * @param {Boolean} config.behavior.launchApp
   * @param {('ios.none' | 'android.attached' | 'ios.simulator' | 'android.emulator')} config.device.driver
   * @param {String} [config.device.avdName]
   * @param {String} [config.device.adbName]
   * @param {String} [config.device.id]
   * @param {String} [config.device.name]
   * @param {String} [config.device.type]
   * @param {String} [config.device.os]
   * @param [config.session]
   * @param {String} config.session.server
   * @param {String} config.session.sessionId
   */
  constructor(config) {
    this._config = config;
    this._client = null;
    this._server = null;
    this._artifactsManager = new ArtifactsManager();

    this.device = null;
  }

  async init() {
    const config = this._config;

    if (!config.session) {
      config.session = await this._initLocalSession();
    }

    this._client = new Client(config.session);
    await this._client.connect();

    const DeviceDriverClass = drivers.resolveDriver(config.device.driver);
    const deviceDriver = new DeviceDriverClass({
      client: this._client,
    });

    this._artifactsManager.subscribeToDeviceEvents(deviceDriver);
    this._artifactsManager.registerArtifactPlugins(deviceDriver.declareArtifactPlugins());

    const device = await Device.init(deviceDriver, {
      appConfig: config.app,
      deviceConfig: config.device,
      sessionConfig: config.session,
    });

    if (!config.behavior.reuse) {
      await device.uninstallApp();
      await device.installApp();
    }

    if (config.behavior.launchApp) {
      await device.launchApp({newInstance: true});
    }

    const exportedAPI = { ...deviceDriver.matchers, device };
    Object.assign(this, exportedAPI);
    if (config.behavior.initGlobals) {
      Object.assign(global, exportedAPI);
    }

    await this._artifactsManager.onBeforeAll();

    return this;
  }

  async _initLocalSession() {
    const url = `ws://localhost:${await getFreePort()}`;
    this._server = new DetoxServer({ url });

    return {
      server: url,
      sessionId: uuid.UUID(),
    };
  }

  async cleanup() {
    const config = this._config;

    await this._artifactsManager.onAfterAll();

    if (this._client) {
      this._client.dumpPendingRequests();
      await this._client.cleanup();
    }

    if (this.device) {
      await this.device._cleanup();
    }

    if (this._server) {
      await this._server.close();
    }

    if (config.behavior.cleanup && this.device) {
      await this.device.shutdown();
    }
  }

  async beforeEach(testSummary) {
    this._validateTestSummary(testSummary);
    this._logTestRunCheckpoint('DETOX_BEFORE_EACH', testSummary);
    await this._dumpUnhandledErrorsIfAny({
      pendingRequests: false,
      testName: testSummary.fullName,
    });
    await this._artifactsManager.onBeforeEach(testSummary);
  }

  async afterEach(testSummary) {
    this._validateTestSummary(testSummary);
    this._logTestRunCheckpoint('DETOX_AFTER_EACH', testSummary);
    await this._artifactsManager.onAfterEach(testSummary);
    await this._dumpUnhandledErrorsIfAny({
      pendingRequests: testSummary.timedOut,
      testName: testSummary.fullName,
    });
  }

  _logTestRunCheckpoint(event, { status, fullName }) {
    log.trace({ event, status }, `${status} test: ${JSON.stringify(fullName)}`);
  }

  _validateTestSummary(testSummary) {
    if (!_.isPlainObject(testSummary)) {
      throw new DetoxRuntimeError({
        message: `Invalid test summary was passed to detox.beforeEach(testSummary)` +
          '\nExpected to get an object of type: { title: string; fullName: string; status: "running" | "passed" | "failed"; }',
        hint: 'Maybe you are still using an old undocumented signature detox.beforeEach(string, string, string) in init.js ?' +
          '\nSee the article for the guidance: ' +
          'https://github.com/wix/detox/blob/master/docs/APIRef.TestLifecycle.md',
        debugInfo: `testSummary was: ${util.inspect(testSummary)}`,
      });
    }

    switch (testSummary.status) {
      case 'running':
      case 'passed':
      case 'failed':
        break;
      default:
        throw new DetoxRuntimeError({
          message: `Invalid test summary status was passed to detox.beforeEach(testSummary). Valid values are: "running", "passed", "failed"`,
          hint: "It seems like you've hit a Detox integration issue with a test runner. You are encouraged to report it in Detox issues on GitHub.",
          debugInfo: `testSummary was: ${JSON.stringify(testSummary, null, 2)}`,
        });
    }
  }

  async _dumpUnhandledErrorsIfAny({ testName, pendingRequests }) {
    if (pendingRequests) {
      this._client.dumpPendingRequests({testName});
    }

    const pendingAppCrash = this._client.getPendingCrashAndReset();

    if (pendingAppCrash) {
      log.error({ event: 'APP_CRASH' }, `App crashed in test '${testName}', here's the native stack trace: \n${pendingAppCrash}`);
      await this.device.launchApp({ newInstance: true });
    }
  }
}

module.exports = Detox;
