'use strict';

var path = require('path');
var yosay = require('yosay');
var chalk = require('chalk');
var Promise = require('bluebird');
var _ = require('lodash');
var fs = Promise.promisifyAll(require('fs'));

module.exports = function () {
  var self = this, done = this.async();
  var props = this.props, argv = this.argv;

  return Promise.resolve()
  .then(function() {
    var config = _.pick(props, 'type', 'name', 'module', 'username', /*'version', 'description', */ 'ngVersion', 'license', 'htmlPreprocessor', 'jsPreprocessor', 'cssPreprocessor');
    config.module = props.moduleName; // @todo rename
    if(props.namespace) config.namespace = props.namespace;
    return self.writeAsync('ngfactory.json', JSON.stringify(config, null, 2));
  })
  .then(function() {

    var files = [
      'json',
      props.jsPreprocessor !== 'none' ? props.jsPreprocessor : 'js',
      props.htmlPreprocessor !== 'none' ? props.htmlPreprocessor : 'html',
      props.cssPreprocessor !== 'none' ? props.cssPreprocessor.replace('sass', 'scss') : 'css'
    ];

    return require('./' + props.type).call(self, files);
  })
  .then(function() {

    var dotfiles = ['.gitignore', '.gitattributes', '.editorconfig', '.jshintrc'];
    var pkgfiles = ['gulpfile.js', 'package.json', 'bower.json', 'README.md', '.bowerrc'];

    return Promise.props({
      dotfiles: Promise.all(dotfiles.map(function(file) {
        return self.copyAsync(file, file);
      })),
      pkgfiles: Promise.all(pkgfiles.map(function(file) {
        return self.templateAsync(file, file);
      }))
    });

  })
  .then(function setupProjectFiles(props) {

    done();

  });

};

/*
  writing: {
    app: function () {
    dd('writing');
      this.dest.mkdir('app');
      this.dest.mkdir('app/templates');

      this.src.copy('_package.json', 'package.json');
      this.src.copy('_bower.json', 'bower.json');
    },

    projectfiles: function () {
      this.src.copy('editorconfig', '.editorconfig');
      this.src.copy('jshintrc', '.jshintrc');
    }
  },*/


  // .then(function setupApplicationFiles() {
  //   if(props.type === 'component') return;

  //   var files = ['js', props.htmlPreprocessor === 'jade' ? 'jade' : 'html', props.cssPreprocessor === 'less' ? 'less' : 'css'];

  //   // Copy base files
  //   return globAsync('app/**/*.{' + files.join(',') + '}', {cwd: path.join(__dirname, 'templates')}).each(function(filepath) {
  //     return self.template(filepath, filepath);
  //   });

  // })
  // .then(function setupProjectFiles() {

  //   // Dotfiles
  //   self.copy('.gitignore', '.gitignore');
  //   self.copy('.gitattributes', '.gitattributes');
  //   self.copy('.editorconfig', '.editorconfig');
  //   self.copy('.jshintrc', '.jshintrc');
  //   self.copy('.bowerrc', '.bowerrc');

  //   // Package
  //   self.template('gulpfile.js', 'gulpfile.js');
  //   self.template('package.json', 'package.json');
  //   self.template('bower.json', 'bower.json');
  //   self.template('README.md', 'README.md');

  // })
  // .then(function() {
  //   done();
  // });
