const _ = require('lodash');
const { composeDetoxConfig } = require('./configuration');

describe('configuration', () => {
  let detoxSection;
  let initParams;
  let cliArgs;
  let example;

  describe('composeDetoxConfig', () => {
    beforeEach(() => {
      detoxSection = initParams = cliArgs = undefined;
      cliArgs = {};
      example = require('./configurations.mock')();
    });

    describe('invalid cases', () => {
      afterEach(() => {
        expect(() => composeDetoxConfig(detoxSection, initParams, cliArgs)).toThrowErrorMatchingSnapshot();
      });

      it('should throw on empty section', () => {});

      it('should throw on empty configurations', () => {
        detoxSection = { configurations: {} };
      });

      it('should throw if configuration was not found', () => {
        detoxSection = { configurations: { one: {} } };
        cliArgs.configuration = 'two';
      });

      it('should throw if configuration could not be deduced', () => {
        detoxSection = { configurations: { one: {}, two: {} } };
      });

      it('should throw if configuration type is not supported', () => {
        detoxSection = { configurations: _.pick(example.configurations, 'unknown') };
      });

      it('should throw if app binary does not exist', () => {
        detoxSection = { configurations: _.pick(example.configurations, 'unexistentBinary') };
      });

      it('should throw if global session config has no sessionId', () => {
        detoxSection = {
          session: _.omit(example.session, 'sessionId'),
          configurations: _.pick(example.configurations, 'existentBinary')
        };
      });

      it('should throw if global session config has no server', () => {
        detoxSection = {
          session: _.omit(example.session, 'server'),
          configurations: _.pick(example.configurations, 'existentBinary')
        };
      });
    });

    describe('valid device cases', () => {
      beforeEach(() => {
        detoxSection = { configurations: {} };
      });

      afterEach(() => {
        expect(composeDetoxConfig(detoxSection, initParams, cliArgs).device).toMatchSnapshot();
      });

      it('should adapt name from ios.none', () => {
        detoxSection.configurations = _.pick(example.configurations, 'ios.none');
      });

      it('should adapt name from ios.simulator', () => {
        detoxSection.configurations = _.pick(example.configurations, 'simulatorByType');
      });

      it('should adapt name and os (comma-separated) from ios.simulator', () => {
        detoxSection.configurations = _.pick(example.configurations, 'simulatorByTypeOS');
      });

      it('should adapt name from android.emulator', () => {
        detoxSection.configurations = _.pick(example.configurations, 'emulatorByAVD');
      });

      it('should adapt name from android.attached', () => {
        detoxSection.configurations = _.pick(example.configurations, 'attachedByADB');
      });

      it('should tolerate nameless device', () => {
        detoxSection.configurations.nameless = { type: 'android.emulator' };
      });

      it('should find configuration explicitly', () => {
        cliArgs = { configuration: 'ios.none' };
        detoxSection.configurations = example.configurations;
      });
    });

    describe('valid session cases', () => {
      beforeEach(() => {
        detoxSection = { configurations: _.pick(example.configurations, 'ios.none') };
      });

      afterEach(() => {
        expect(composeDetoxConfig(detoxSection, initParams, cliArgs).session).toMatchSnapshot();
      });

      it('should take top session', () => {
        detoxSection.session = example.session;
      });

      it('should take configuration session', () => {
        detoxSection.configurations = _.pick(example.configurations, 'custom session');
      });

      it('should prefer configuration session', () => {
        detoxSection.session = example.session;
        detoxSection.configurations = _.pick(example.configurations, 'custom session');
      });
    });

    describe('valid override cases', () => {
      beforeEach(() => {
        detoxSection = { configurations: _.pick(example.configurations, 'ios.none') };
      });

      afterEach(() => {
        expect(composeDetoxConfig(detoxSection, initParams, cliArgs).behavior).toMatchSnapshot();
      });

      it('should have default behavior', () => {
        cliArgs = null;
        initParams = null;
      });

      it('should take overrides from cli args', () => {
        cliArgs = {
          cleanup: true,
          reuse: true,
        };
      });

      it('should take reuse also from initParams', () => {
        initParams = {
          reuse: true,
          initGlobals: false,
        };
      });
    });
  });
});
