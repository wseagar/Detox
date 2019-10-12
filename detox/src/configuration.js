const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const drivers = require('./devices/drivers');
const DetoxRuntimeError = require('./errors/DetoxRuntimeError');
const fsext = require('./utils/fsext');
const pretty = require('./utils/pretty');

function composeDetoxConfig(detoxSection, initParams, cliArgs) {
  initParams = initParams || {};
  cliArgs = cliArgs || {};

  if (_.isEmpty(detoxSection)) {
    throw new DetoxRuntimeError({
      message: `There was no Detox configuration section passed to detox.init()`,
      hint: `Make sure you pass "detox" section from package.json to detox.init(detoxSection)`,
    });
  }

  if (_.isEmpty(detoxSection.configurations)) {
    throw new DetoxRuntimeError({
      message: `There are no "configurations" in detoxSection object passed to detox.init(detoxSection)`,
      hint: 'Make sure your "detox" section in package.json has one or more "configurations":',
      debugInfo: JSON.stringify(detoxSection, null, 4),
    });
  }

  let detoxConfiguration;
  let configurationName;

  if (cliArgs.configuration) {
    configurationName = cliArgs.configuration;
    detoxConfiguration = detoxSection.configurations[cliArgs.configuration];

    if (!detoxConfiguration) {
      throw new DetoxRuntimeError({
        message: `Cannot find a Detox configuration named "${cliArgs.configuration}"`,
        hint: 'Was it a typo? Here are the available configurations:',
        debugInfo: pretty.like.markdown.list(Object.keys(detoxSection.configurations)),
      });
    }
  } else {
    [configurationName, detoxConfiguration] = single(Object.entries(detoxSection.configurations)) || [];

    if (!detoxConfiguration) {
      throw new DetoxRuntimeError({
        message: `Cannot automatically deduce which Detox configuration to use.`,
        hint: 'Pass explicitly one of the following values as --configuration <name>, or add a new one:',
        debugInfo: pretty.like.markdown.list(Object.keys(detoxSection.configurations)),
      });
    }
  }

  if (!drivers.resolveDriver(detoxConfiguration.type)) {
    throw new DetoxRuntimeError({
      message: `Unknown device type: ${detoxConfiguration.type}`,
      hint: `Make sure "type" in "${configurationName}" configuration for Detox is one of the following:\n` +
            pretty.like.markdown.list(drivers.driverTypes),
      debugInfo: pretty.like.json.fragment(configurationName, detoxConfiguration),
    });
  }

  if (detoxConfiguration.binaryPath && !fs.existsSync(detoxConfiguration.binaryPath)) {
    throw new DetoxRuntimeError({
      message: `Failed to find the app binary at path: ${fsext.getAbsolutePath(detoxConfiguration.binaryPath)}`,
      hint: `Have you forgotten to build the app? Check your Detox configuration:`,
      debugInfo: pretty.like.json.fragment(configurationName, detoxConfiguration),
    });
  }

  const session = detoxConfiguration.session || detoxSection.session;

  if (session) {
    if (!session.server) {
      throw new DetoxRuntimeError({
        message: `session.server property is missing`,
        hint: `Usually you don't need "session" configuration. If you do, then add "server" in format: "ws://<address>:<port>" to:`,
        debugInfo: pretty.like.json.fragment('session', session),
      });
    }

    if (!session.sessionId) {
      throw new DetoxRuntimeError({
        message: `session.sessionId property is missing`,
        hint: `Usually you don't need "session" configuration. If you do, then add "sessionId": "<some arbitrary string>" to:`,
        debugInfo: pretty.like.json.fragment('session', session),
      });
    }
  }

  return {
    app: {
      binaryPath: detoxConfiguration.binaryPath,
      testBinaryPath: detoxConfiguration.testBinaryPath,
    },
    behavior: {
      launchApp: true,
      initGlobals: true,
      ...initParams,
      cleanup: Boolean(cliArgs.cleanup),
      reuse: Boolean(initParams.reuse || cliArgs.reuse),
    },
    device: {
      driver: detoxConfiguration.type,
      ...(detoxConfiguration.device || convertDeviceNameToMatcher(detoxConfiguration.type, detoxConfiguration.name))
    },
    session,
  };
}

function convertDeviceNameToMatcher(driver, name) {
  if (!name) {
    return {};
  }

  switch (driver) {
    case 'android.attached':
      return { adbName: name };
    case 'android.emulator':
      return { avdName: name };
    case 'ios.simulator':
      if (_.includes(name, ',')) {
        const [type, os] = _.split(name, /\s*,\s*/);
        return { type, os };
      } else {
        return { type: name };
      }
    default:
      return {};
  }
}

function single(array) {
  return array.length === 1 ? array[0] : undefined;
}

module.exports = {
  composeDetoxConfig,
};
