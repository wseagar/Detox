const _ = require('lodash');
const DetoxRuntimeError = require('../errors/DetoxRuntimeError');
const debug = require('../utils/debug'); //debug utils, leave here even if unused
const fsext = require('../utils/fsext');

class Device {
  constructor(deviceDriver, { appConfig, deviceConfig, sessionConfig }) {
    this._appConfig = appConfig;
    this._deviceConfig = deviceConfig;
    this._sessionConfig = sessionConfig;
    this._processes = {};
    this._debug = debug;

    this.deviceDriver = deviceDriver;
  }

  static async init(driver, config) {
    return await new Device(driver, config)._prepare();
  }

  async _prepare() {
    this._binaryPath = fsext.getAbsolutePath(this._appConfig.binaryPath);
    this._testBinaryPath = fsext.getAbsolutePath(this._appConfig.testBinaryPath);
    this._deviceId = await this.deviceDriver.acquireFreeDevice(this._deviceConfig);
    this._bundleId = await this.deviceDriver.getBundleIdFromBinary(this._binaryPath);

    return this;
  }

  async launchApp(params = {newInstance: false}, bundleId) {
    const payloadParams = ['url', 'userNotification', 'userActivity'];
    const hasPayload = this._assertHasSingleParam(payloadParams, params);

    if (params.delete) {
      await this._terminateApp();
      await this._reinstallApp();
    } else if (params.newInstance) {
      await this._terminateApp();
    }

    if (params.permissions) {
      await this.deviceDriver.setPermissions(this._deviceId, this._bundleId, params.permissions);
    }

    const _bundleId = bundleId || this._bundleId;
    if (this._isAppInBackground(params, _bundleId)) {
      if (hasPayload) {
        await this.deviceDriver.deliverPayload({...params, delayPayload: true});
      }
    }

    const launchArgs = this._prepareLaunchArgs(params);
    const processId = await this.deviceDriver.launchApp(this._deviceId, _bundleId, launchArgs, params.languageAndLocale);
    this._processes[_bundleId] = processId;

    await this.deviceDriver.waitUntilReady();
    await this.deviceDriver.waitForActive();

    if(params.detoxUserNotificationDataURL) {
      await this.deviceDriver.cleanupRandomDirectory(params.detoxUserNotificationDataURL);
    }

    if(params.detoxUserActivityDataURL) {
      await this.deviceDriver.cleanupRandomDirectory(params.detoxUserActivityDataURL);
    }
  }

  get name() {
    return this.deviceDriver.name;
  }

  async takeScreenshot(name) {
    if (!name) {
      throw new Error('Cannot take a screenshot with an empty name.');
    }

    return this.deviceDriver.takeScreenshot(name);
  }

  _isAppInBackground(params, _bundleId) {
    return !params.delete && !params.newInstance && this._processes[_bundleId];
  }

  _assertHasSingleParam(singleParams, params) {
    let paramsCounter = 0;

    singleParams.forEach((item) => {
      if(params[item]) {
        paramsCounter += 1;
      }
    });
    if (paramsCounter > 1) {
      throw new Error(`Call to 'launchApp(${JSON.stringify(params)})' must contain only one of ${JSON.stringify(singleParams)}.`);
    }
    return (paramsCounter === 1);
  }

  /**deprecated */
  async relaunchApp(params = {}, bundleId) {
    if (params.newInstance === undefined) {
      params['newInstance'] = true;
    }
    await this.launchApp(params, bundleId);
  }

  async sendToHome() {
    await this.deviceDriver.sendToHome(this._deviceId);
    await this.deviceDriver.waitForBackground();
  }

  async setBiometricEnrollment(toggle) {
    let yesOrNo = toggle ? 'YES' : 'NO'
    await this.deviceDriver.setBiometricEnrollment(this._deviceId, yesOrNo);
  }

  async matchFace() {
    await this.deviceDriver.matchFace(this._deviceId);
    await this.deviceDriver.waitForActive();
  }

  async unmatchFace() {
    await this.deviceDriver.unmatchFace(this._deviceId);
    await this.deviceDriver.waitForActive();
  }

  async matchFinger() {
    await this.deviceDriver.matchFinger(this._deviceId);
    await this.deviceDriver.waitForActive();
  }

  async unmatchFinger() {
    await this.deviceDriver.unmatchFinger(this._deviceId);
    await this.deviceDriver.waitForActive();
  }

  async shake() {
    await this.deviceDriver.shake(this._deviceId);
  }

  async terminateApp(bundleId) {
    const _bundleId = bundleId || this._bundleId;
    await this.deviceDriver.terminate(this._deviceId, _bundleId);
  }

  async installApp(binaryPath, testBinaryPath) {
    const _binaryPath = fsext.getAbsolutePath(binaryPath) || this._binaryPath;
    const _testBinaryPath = fsext.getAbsolutePath(testBinaryPath) || this._testBinaryPath;

    if (!_binaryPath && !this._binaryPath) {
      throw new DetoxRuntimeError({
        message: 'To install an app, you need to specify its location first',
        hint: `Check that you have app's "binaryPath" defined in your Detox configuration.`
      })
    }

    await this.deviceDriver.installApp(this._deviceId, _binaryPath, _testBinaryPath);
  }

  async uninstallApp(bundleId) {
    const _bundleId = bundleId || this._bundleId;
    await this.deviceDriver.uninstallApp(this._deviceId, _bundleId);
  }

  async reloadReactNative() {
    await this.deviceDriver.reloadReactNative();
  }

  async openURL(params) {
    if (typeof params !== 'object' || !params.url) {
      throw new Error(`openURL must be called with JSON params, and a value for 'url' key must be provided. example: await device.openURL({url: "url", sourceApp[optional]: "sourceAppBundleID"}`);
    }

    await this.deviceDriver.deliverPayload(params);
  }

  async shutdown() {
    await this.deviceDriver.shutdown(this._deviceId);
  }

  async setOrientation(orientation) {
    await this.deviceDriver.setOrientation(this._deviceId, orientation);
  }

  async setLocation(lat, lon) {
    lat = String(lat);
    lon = String(lon);
    await this.deviceDriver.setLocation(this._deviceId, lat, lon);
  }

  async _sendPayload(key, params) {
    const payloadFilePath = this.deviceDriver.createPayloadFile(params);
    let payload = {};
    payload[key] = payloadFilePath;
    await this.deviceDriver.deliverPayload(payload);
    this.deviceDriver.cleanupRandomDirectory(payloadFilePath);
  }

  async sendUserActivity(params) {
    await this._sendPayload('detoxUserActivityDataURL', params);
  }

  async sendUserNotification(params) {
    await this._sendPayload('detoxUserNotificationDataURL', params);
  }

  async setURLBlacklist(urlList) {
    await this.deviceDriver.setURLBlacklist(urlList);
  }

  async enableSynchronization() {
    await this.deviceDriver.enableSynchronization();
  }

  async disableSynchronization() {
    await this.deviceDriver.disableSynchronization();
  }

  async resetContentAndSettings() {
    await this.deviceDriver.resetContentAndSettings(this._deviceId);
  }

  getPlatform() {
    return this.deviceDriver.getPlatform(this._deviceId);
  }

  async _cleanup() {
    await this.deviceDriver.cleanup(this._deviceId, this._bundleId);
  }

  async pressBack() {
    await this.deviceDriver.pressBack(this._deviceId);
  }

  getUiDevice() {
    return this.deviceDriver.getUiDevice();
  }

  _prepareLaunchArgs(params) {
    const launchArgs = {
      'detoxServer': this._sessionConfig.server,
      'detoxSessionId': this._sessionConfig.sessionId,
      ...params.launchArgs,
    };

    if (params.url) {
      launchArgs['detoxURLOverride'] = params.url;
      if (params.sourceApp) {
        launchArgs['detoxSourceAppOverride'] = params.sourceApp;
      }
    } else if (params.userNotification) {
      this._createPayloadFileAndUpdatesParamsObject('userNotification', 'detoxUserNotificationDataURL', params, launchArgs);
    } else if (params.userActivity) {
      this._createPayloadFileAndUpdatesParamsObject('userActivity', 'detoxUserActivityDataURL', params, launchArgs);
    }

    if (params.disableTouchIndicators) {
      launchArgs['detoxDisableTouchIndicators'] = true;
    }

    return launchArgs;
  }

  _createPayloadFileAndUpdatesParamsObject(key, launchKey, params, baseLaunchArgs) {
    const payloadFilePath = this.deviceDriver.createPayloadFile(params[key]);
    baseLaunchArgs[launchKey] = payloadFilePath;
    //`params` will be used later for `deliverPayload`, so remove the actual notification and add the file URL
    delete params[key];
    params[launchKey] = payloadFilePath;
  }

  async _terminateApp() {
    await this.deviceDriver.terminate(this._deviceId, this._bundleId);
    this._processes[this._bundleId] = undefined;
  }

  async _reinstallApp() {
    await this.deviceDriver.uninstallApp(this._deviceId, this._bundleId);
    await this.deviceDriver.installApp(this._deviceId, this._binaryPath, this._testBinaryPath);
  }
}

module.exports = Device;
