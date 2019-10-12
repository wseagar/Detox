function asteriskLeft(line) {
  return '* ' + line;
}

function likeMarkdownList(items) {
  return items.map(asteriskLeft).join('\n');
}

function likeJsonFragment(key, value) {
  return JSON.stringify(key) + ': ' + JSON.stringify(value, null, 4);
}

module.exports = {
  like: {
    json: {
      fragment: likeJsonFragment,
    },
    markdown: {
      list: likeMarkdownList,
    }
  },
};
