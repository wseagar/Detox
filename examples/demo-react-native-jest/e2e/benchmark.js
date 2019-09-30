process.env.recordPerformance = 'all';

const N = Number(process.env.BENCHMARK_TIMES || "2");
const BENCHMARK_SUBSTRING = ' benchmark #';

function template(_it_) {
  return function (name, ...args) {
    for (let index = 1; index <= N; index++) {
      _it_(name + BENCHMARK_SUBSTRING + index, ...args);
    }
  };
}

module.exports = Object.assign(template(it), {
  only: template(it.only),
  skip: template(it.skip),
});
