const fs = require('fs-extra');
const path = require('path');

async function getDirectories (rootPath) {
  let files = await fs.readdir(rootPath);
  let dirs = [];
  for (let file of files) {
    let pathString = path.resolve(rootPath, file);
    if ((await fs.lstat(pathString)).isDirectory()) {
      dirs.push(file);
    }
  }
  return dirs.sort();
}

function getAbsolutePath(rawPath) {
  return !rawPath || path.isAbsolute(rawPath)
    ? rawPath
    : path.join(process.cwd(), rawPath);
}

module.exports = {
  getDirectories,
  getAbsolutePath,
};
