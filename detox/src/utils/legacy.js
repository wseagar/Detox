function toFullName(test, separator = ' ') {
  let suiteFullName = '';

  for (
    let parent = test.parent;
    parent.parent; // Since there's always an unwanted root made up by jest
    parent = parent.parent
  ) {
    suiteFullName = parent.name + separator + suiteFullName;
  }

  return suiteFullName + test.name;
}

function hasTimedOut(test) {
  const { errors } = test;
  const errorsArray = (_.isArray(errors) ? errors : [errors]);
  const timedOut = _.chain(errorsArray)
    .flattenDeep()
    .filter(_.isObject)
    .some(e => _.includes(e.message, 'Exceeded timeout'))
    .value();
  return timedOut;
}

module.exports = {
  toFullName,
  hasTimedOut,
};