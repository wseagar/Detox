const DRIVERS = {
  'ios.simulator': require('./SimulatorDriver'),
  'ios.none': require('./IosDriver'),
  'android.emulator': require('./EmulatorDriver'),
  'android.attached': require('./AttachedAndroidDriver'),
};

module.exports = {
  driverTypes: Object.keys(DRIVERS),
  resolveDriver(driverType) {
    return DRIVERS[driverType];
  },
};
