module.exports = () => ({
  session: {
    server: 'ws://localhost:20000',
    sessionId: 'default session config'
  },
  configurations: {
    'unknown': {
      type: 'symbian.attached',
    },
    'unexistentBinary': {
      type: 'ios.simulator',
      binaryPath: 'wdkhdsflkhsldkjfhlskdjf.app',
    },
    'existentBinary': {
      type: 'ios.simulator',
      binaryPath: __filename,
    },
    'ios.none': {
      type: 'ios.none',
      name: 'should be omitted',
    },
    'simulatorByType': {
      type: 'ios.simulator',
      name: 'iPhone X',
    },
    'simulatorByTypeOS': {
      type: 'ios.simulator',
      name: 'iPhone X, iOS 12.0',
    },
    'emulatorByAVD': {
      type: 'android.emulator',
      name: 'Nexus_5X_API_28',
    },
    'attachedByADB': {
      type: 'android.attached',
      name: 'QNU0011223344',
    },
    'attachedQuery': {
      type: 'android.attached',
      device: {
        adbName: 'QNU0011223344'
      },
    },
    'emulatorQuery': {
      type: 'android.attached',
      device: {
        avdName: 'Nexus_5X_API_28'
      },
    },
    'simulatorQuery': {
      type: 'android.attached',
      device: {
        name: 'MySimulator',
        os: 'iOS 12.0',
      },
    },
    'custom session': {
      type: 'ios.simulator',
      session: {
        server: 'ws://localhost:40000',
        sessionId: 'custom session config'
      },
    },
  },
});
