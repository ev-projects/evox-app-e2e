const fse = require('fs-extra');
const path = require('path');

// __dirname gives you the current file's directory in CommonJS
const topDir = __dirname;

// Clear and copy TinyMCE folder
fse.emptyDirSync(path.join(topDir, 'public', 'tinymce'));
fse.copySync(
  path.join(topDir, 'node_modules', 'tinymce'),
  path.join(topDir, 'public', 'tinymce'),
  { overwrite: true }
);
