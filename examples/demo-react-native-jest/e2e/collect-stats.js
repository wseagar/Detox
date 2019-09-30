const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const util = require('util');
const exec = util.promisify(cp.exec);
const { perferReport } = require('@wix/perfer/dist/src/commands/perferReport');

const BENCHMARK_SUBSTRING = ' benchmark #';
const FLAG_EMOJI = /^[✓✗] /;

async function collectStats() {
  const artifactsDir = process.env.artifactsLocation;
  const inferDtxRecPath = (testDir) => path.join(artifactsDir, testDir, 'test.dtxrec');

  if (!fs.existsSync(artifactsDir)) {
    console.error('No artifacts found - no performance stats, sorry');
    return;
  }

  const profiles = _.chain(fs.readdirSync(artifactsDir))
    .filter(isBenchmarkDir)
    .groupBy(extractBenchmarkName)
    .mapValues((dirnames, benchmarkName) => ({
      name: benchmarkName,
      dtxRecPaths: dirnames.map(inferDtxRecPath),
    }))
    .values()
    .value();

  console.log('Profiles:');
  console.log(profiles);
  console.log('Event stream:');

  let eventStream = [];

  for (const profile of profiles) {
    const eventsByProfile = await Promise.all(profile.dtxRecPaths.map(queryDtxRec));
    const events = _.chain(eventsByProfile)
      .map((events, runIndex) => events.map(e => Object.assign(e, { runIndex })))
      .flatten()
      .map(e => ({
        type: 'metric',
        run_id: e.runIndex + 1,
        scenario_name: profile.name,
        suite: {
          path: 'e2e/app-bench.test.js',
          environment: 'node',
          lineNumber: 6,
        },
        metric_type: 'measure',
        metric_name: _.compact([e.name, e.additionalInfoStart, e.additionalInfoEnd]).join(' - '),
        metric_value: e.duration,
      }))
      .value()

    for (const e of events) {
      console.log(JSON.stringify(e));
    }

    eventStream = eventStream.concat(events);
  }

  await perferReport({
    decimalPlace: 2,
    reportUrl: undefined,
    verbose: false,
    eventStream,
  });
}

function isBenchmarkDir(dirname) {
  return dirname.includes(BENCHMARK_SUBSTRING);
}

function extractBenchmarkName(dirname) {
  const startIndex = FLAG_EMOJI.test(dirname) ? 2 : 0;
  return dirname.slice(startIndex, dirname.lastIndexOf(BENCHMARK_SUBSTRING));
}

async function queryDtxRec(dtxRecPath) {
  const cmd = [
    `dtxinst`,
    `--document "${dtxRecPath}"`,
    `--entity "EventSample"`,
    `-k "name, additionalInfoStart, additionalInfoEnd, timestamp, duration"`,
    `--predicate 'category = "Performance"'`,
    `--fetch`,
  ].join(' ');

  const { stdout } = await exec(cmd, { encoding: 'utf8' });
  const events = JSON.parse(stdout);

  return events;
}

module.exports = collectStats;
