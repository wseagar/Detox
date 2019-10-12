const _ = require('lodash');
const funpermaproxy = require('funpermaproxy');

const Detox = require('./Detox');
const DetoxConstants = require('./DetoxConstants');
const argparse = require('./utils/argparse');
const configuration = require('./configuration');
const log = require('./utils/logger').child({ __filename });

const _detox = Symbol('detox');

class DetoxExportWrapper {
  constructor() {
    this[_detox] = null;

    this.init = this.init.bind(this);
    this.cleanup = this.cleanup.bind(this);

    this.DetoxConstants = DetoxConstants;

    this._definePassthroughMethod('beforeEach');
    this._definePassthroughMethod('afterEach');

    this._definePassthroughMethod('element');
    this._definePassthroughMethod('expect');
    this._definePassthroughMethod('waitFor');

    this._defineProxy('by');
    this._defineProxy('device');
  }

  async init(config, params) {
    const detoxInstanceConfig = configuration.composeDetoxConfig(config, params, {
      cleanup: argparse.getArgValue('cleanup'),
      configuration: argparse.getArgValue('configuration'),
      deviceName: argparse.getArgValue('device-name'),
      reuse: argparse.getArgValue('reuse'),
    });

    this[_detox] = await DetoxExportWrapper._safeInitializeDetox(detoxInstanceConfig);
    return this[_detox];
  }

  async cleanup() {
    if (this[_detox]) {
      await this[_detox].cleanup();
      this[_detox] = null;
    }
  }

  _definePassthroughMethod(name) {
    this[name] = (...args) => {
      if (this[_detox]) {
        return this[_detox][name](...args);
      }
    };
  }

  _defineProxy(name) {
    this[name] = funpermaproxy(() => (this[_detox] && this[_detox][name]));
  }

  static async _safeInitializeDetox(detoxConfig) {
    let detoxInstance = null;

    try {
      detoxInstance = new Detox(detoxConfig);
      await detoxInstance.init();

      return detoxInstance;
    } catch (err) {
      log.error({ event: 'DETOX_INIT_ERROR' }, '\n', err);

      if (detoxInstance) {
        await detoxInstance.cleanup();
      }

      throw err;
    }
  }
}

module.exports = DetoxExportWrapper;
