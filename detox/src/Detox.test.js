const _ = require('lodash');
const schemes = require('./configurations.mock');

const defaultPlatformEnv = {
  darwin: {},
  linux: {
    // Not set by default on Ubuntu
    // XDG_DATA_HOME: '/home/detox-user/.local/share',
  },
  win32: {
    // Required for appdatapath.js
    LOCALAPPDATA: 'C:\\Users\\detox-user\\AppData\\Local',
    USERPROFILE: 'C:\\Users\\detox-user',
  },
};

describe('Detox', () => {
  let fs;
  let Detox;
  let detox;

  const invalidDetoxConfig = () => ({
    app: {},
    behavior: {},
    device: {},
  });

  const validDetoxConfig = () => ({
    app: {
      binaryPath: 'test/app.apk',
      testBinaryPath: 'test/app.test.apk',
    },
    behavior: {
      cleanup: false,
      reuse: false,
      initGlobals: false,
      launchApp: false,
    },
    device: {
      driver: 'android.emulator',
      avdName: 'emulator-5554',
    },
  });

  const validDetoxConfigWithSession = () => ({
    ...validDetoxConfig(),
    session: {
      server: 'ws://localhost:8099',
      sessionId: 'test',
    },
  });

  const clientMockData = {lastConstructorArguments: null};
  const deviceMockData = {lastConstructorArguments: null};

  beforeEach(async () => {
    function setCustomMock(modulePath, dataObject) {
      const JestMock = jest.genMockFromModule(modulePath);
      class FinalMock extends JestMock {
        constructor(...rest) {
          super(rest);
          dataObject.lastConstructorArguments = rest;
        }
        on(event, callback) {
          if (event === 'launchApp') {
            callback({});
          }
        }
      }
      jest.setMock(modulePath, FinalMock);
    }

    jest.mock('./utils/logger');
    jest.mock('fs');
    jest.mock('fs-extra');
    fs = require('fs');
    jest.mock('./ios/expect');
    setCustomMock('./client/Client', clientMockData);
    setCustomMock('./devices/Device', deviceMockData);

    process.env = Object.assign({}, defaultPlatformEnv[process.platform]);

    global.device = undefined;

    jest.mock('./devices/drivers/IosDriver');
    jest.mock('./devices/drivers/AndroidDriver');
    jest.mock('./devices/drivers/SimulatorDriver');
    jest.mock('./devices/drivers/AttachedAndroidDriver');
    jest.mock('./devices/drivers/EmulatorDriver');
    jest.mock('./devices/Device');
    jest.mock('./server/DetoxServer');
    jest.mock('./client/Client');
    jest.mock('./utils/logger');
  });

  it(`Passing --cleanup should shutdown the currently running device`, async () => {
    process.env.cleanup = true;
    Detox = require('./Detox');

    detox = new Detox(validDetoxConfig());
    expect(() => detox.cleanup()).not.toThrowError();
  });

  it(`Not passing --cleanup should keep the currently running device up`, async () => {
    Detox = require('./Detox');
    detox = await new Detox(validDetoxConfig()).init();
    await detox.cleanup();
    expect(detox.device.shutdown).toHaveBeenCalledTimes(0);
  });

  it(`One valid device, detox should init with generated session config and default to this device`, async () => {
    Detox = require('./Detox');
    detox = await new Detox(validDetoxConfig()).init();
    expect(clientMockData.lastConstructorArguments[0]).toBeDefined();
  });

  it(`One valid device, detox should use session config and default to this device`, async () => {
    Detox = require('./Detox');
    detox = await new Detox(validDetoxConfigWithSession()).init();

    expect(clientMockData.lastConstructorArguments[0]).toEqual(validDetoxConfigWithSession().session);
  });

  it(`cleanup on a non initialized detox should not throw`, async () => {
    Detox = require('./Detox');
    detox = new Detox(invalidDetoxConfig());
    await detox.cleanup();
  });

  it('should export globals if behavior.initGlobals = true', async () => {
    Detox = require('./Detox');
    const config = _.merge(validDetoxConfigWithSession(), { behavior: { initGlobals: true }});
    detox = await new Detox(config).init();
    expect(global.device).toBeDefined();
  });

  it('should not export globals if behavior.initGlobals = false', async () => {
    Detox = require('./Detox');
    const config = _.merge(validDetoxConfigWithSession(), { behavior: { initGlobals: false }});
    detox = await new Detox(config).init();
    expect(global.device).not.toBeDefined();
  });

  it('should not shutdown device on cleanup if behavior.cleanup = false', async () => {
    Detox = require('./Detox');
    const config = _.merge(validDetoxConfigWithSession(), { behavior: { cleanup: false }});
    detox = await new Detox(config).init();
    await detox.cleanup();
    expect(detox.device.shutdown).not.toHaveBeenCalled();
  });

  it('should shutdown device on cleanup if behavior.cleanup = true', async () => {
    Detox = require('./Detox');
    const config = _.merge(validDetoxConfigWithSession(), { behavior: { cleanup: true }});
    detox = await new Detox(config).init();
    await detox.cleanup();
    expect(detox.device.shutdown).toHaveBeenCalled();
  });

  it(`handleAppCrash if client has a pending crash`, async () => {
    Detox = require('./Detox');
    detox = await new Detox(validDetoxConfigWithSession()).init();
    detox._client.getPendingCrashAndReset.mockReturnValueOnce('crash'); // TODO: rewrite to avoid accessing private fields
    await detox.afterEach({ title: 'a', fullName: 'b', status: 'failed' });
    expect(detox.device.launchApp).toHaveBeenCalledTimes(1);
  });

  it(`handleAppCrash should not dump pending requests if testSummary has no timeout flag`, async () => {
    Detox = require('./Detox');
    detox = new Detox(validDetoxConfigWithSession());
    const testSummary = { title: 'test', fullName: 'suite - test', status: 'failed' };

    await detox.init();
    await detox.afterEach(testSummary);

    expect(detox._client.dumpPendingRequests).not.toHaveBeenCalled();
  });

  it(`handleAppCrash should dump pending requests if testSummary has timeout flag`, async () => {
    Detox = require('./Detox');
    detox = await new Detox(validDetoxConfigWithSession()).init();
    const testSummary = { title: 'test', fullName: 'suite - test', status: 'failed', timedOut: true };

    await detox.afterEach(testSummary);
    expect(detox._client.dumpPendingRequests).toHaveBeenCalled();
  });

  describe('.artifactsManager', () => {
    let artifactsManager;

    beforeEach(async () => {
      jest.mock('./artifacts/ArtifactsManager');
      Detox = require('./Detox');
      detox = await new Detox(validDetoxConfig()).init();
      artifactsManager = detox._artifactsManager; // TODO: rewrite to avoid accessing private fields
    });

    it(`Calling detox.init() should trigger artifactsManager.beforeAll()`, async () => {
      expect(artifactsManager.onBeforeAll).toHaveBeenCalledTimes(1);
    });

    it(`Calling detox.beforeEach() will trigger artifacts manager .onBeforeEach`, async () => {
      const testSummary = { title: 'test', fullName: 'suite - test', status: 'running' };
      await detox.beforeEach(testSummary);

      expect(artifactsManager.onBeforeEach).toHaveBeenCalledWith(testSummary);
    });

    it(`Calling detox.beforeEach() and detox.afterEach() with a deprecated signature will throw an exception`, async () => {
      const testSummary = { title: 'test', fullName: 'suite - test', status: 'running' };

      await expect(detox.beforeEach(testSummary.title, testSummary.fullName, testSummary.status)).rejects.toThrowError();
      expect(artifactsManager.onBeforeEach).not.toHaveBeenCalled();

      await expect(detox.afterEach(testSummary.title, testSummary.fullName, testSummary.status)).rejects.toThrowError();
      expect(artifactsManager.onAfterEach).not.toHaveBeenCalled();
    });

    it(`Calling detox.beforeEach() and detox.afterEach() with incorrect test status will throw an exception`, async () => {
      const testSummary = { title: 'test', fullName: 'suite - test', status: 'incorrect status' };

      await expect(detox.beforeEach(testSummary)).rejects.toThrowError();
      expect(artifactsManager.onBeforeEach).not.toHaveBeenCalled();

      await expect(detox.afterEach(testSummary)).rejects.toThrowError();
      expect(artifactsManager.onAfterEach).not.toHaveBeenCalled();
    });

    it(`Calling detox.afterEach() should trigger artifactsManager.onAfterEach`, async () => {
      const testSummary = { title: 'test', fullName: 'suite - test', status: 'passed' };
      await detox.afterEach(testSummary);

      expect(artifactsManager.onAfterEach).toHaveBeenCalledWith(testSummary);
    });

    it(`Calling detox.cleanup() should trigger artifactsManager.afterAll()`, async () => {
      await detox.cleanup();
      expect(artifactsManager.onAfterAll).toHaveBeenCalledTimes(1);
    });
  });
});
