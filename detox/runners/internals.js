const notify = Symbol('Detox.prototype.notify');
const beforeEach = Symbol('Detox.prototype.beforeEach');
const afterEach = Symbol('Detox.prototype.afterEach');

module.exports = {
  symbols: {
    notify,
    beforeEach,
    afterEach,
  },
};