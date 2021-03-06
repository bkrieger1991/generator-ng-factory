'use strict';

var path = require('path');
var util = require('util');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var mkdirpAsync = Promise.promisify(require('mkdirp'));
var chalk = require('chalk');
var _ = require('lodash');
var inquirer = require('inquirer');
var log = require('./../utils/log');

var yeoman = require('yeoman-generator');
var Generator = yeoman.generators.Base;

// Generator.prototype.log = function() {
//   console.log('[' + chalk.gray('{' + new Date().toLocaleTimeString() + '}] '));
//   console.log.apply(console, arguments);
// };

Generator.prototype.prompt = inquirer.prompt;

Generator.prototype.promptAsync = function(questions) {
  var self = this;
  return new Promise(function(resolve, reject) {
    self.prompt(questions, function(props) {
      _.extend(self.props, props);
      resolve(self.props);
    });
  });
};

var queueAsync = Promise.bind({});
Generator.prototype.queueAsync = function(next) {
  var self = this;
  return (queueAsync = queueAsync.then(next));
};

Generator.prototype.whenUndefinedProp = function(prop) {
  var self = this;
  return function() {
    return !self.props[prop];
  };
};

var bufferEqual = require('buffer-equal');

function readSourceFileAsync(source, options) {
  if(!options) options = {};
  return fs.readFileAsync(path.join(options.cwd || (path.join(__dirname, '..', 'templates')), source))
  .catch(function(err) {
    throw err;
  });
}

function readDestFileAsync(source) {
  return fs.readFileAsync(path.join(process.env.PWD, source))
  .catch(function(err) {
    return null;
  });
}

function readFilePairAsync(source, dest, options) {
  return Promise.all([
    readSourceFileAsync(source, options),
    readDestFileAsync(dest)
  ]);
}

var writeDestFileAsyncForce = false;
function writeDestFileAsync(dest, sourceBuffer, destBuffer, source) {
  /* jshint validthis:true */
  var self = this;
  var argv = this.argv;

  if(!Buffer.isBuffer(sourceBuffer)) {
    sourceBuffer = new Buffer(sourceBuffer);
  }

  if(!destBuffer) {

    return mkdirpAsync(path.dirname(dest))
    .then(function() {
      return fs.writeFileAsync(dest, sourceBuffer);
    })
    .then(function() {
      return self.queueAsync(function() {
        self.log(chalk.green('create') + ' ' + dest);
        return 'create';
      });
    });

  }

  if(bufferEqual(sourceBuffer, destBuffer)) {

    return self.queueAsync(function() {
      self.log(chalk.cyan('identical') + ' ' + dest);
      return 'identical';
    });

  } else {

    var prompt = {
      name: 'action',
      type: 'expand',
      message: 'Overwrite ' + dest + '?',
      when: function() {
        return !writeDestFileAsyncForce && !argv.yes && !argv.y;
      },
      choices: [{
        key: 'y',
        name: 'overwrite',
        value: 'write'
      }, {
        key: 'n',
        name: 'do not overwrite',
        value: 'skip'
      }, {
        key: 'a',
        name: 'overwrite this and all others',
        value: 'force'
      }, {
        key: 'x',
        name: 'abort',
        value: 'abort'
      }]
    };

    return self.queueAsync(function(answer) {

      self.log(chalk.red('conflict') + ' ' + dest);
      return new Promise(function(resolve, reject) {
        self.prompt(prompt, function(props) {
          if(props.action === 'abort') {
            process.exit(0);
            return;
          }
          if(props.action === 'force') {
            writeDestFileAsyncForce = true;
          }
          if(argv.y || argv.yes || writeDestFileAsyncForce || props.action === 'force' || props.action === 'write') {
            return resolve(fs.writeFileAsync(dest, sourceBuffer).then(function() {
              self.log(chalk.yellow('force') + ' ' + dest);
            }).return(props.action));
          }
          if(props.action === 'skip') {
            self.log(chalk.yellow('skip') + ' ' + dest);
          }
          resolve(props.action);
        });
      });

    });
  }
}

// var colors = {
//   skip: 'yellow',
//   force: 'yellow',
//   create: 'green',
//   invoke: 'bold',
//   conflict: 'red',
//   identical: 'cyan',
//   info: 'gray'
// };
Generator.prototype.writeAsync = function(dest, buffer) {
  var self = this;

  return readDestFileAsync(dest)
  .then(function(destBuffer) {
    return writeDestFileAsync.call(self, dest, buffer, destBuffer);
  });

};

Generator.prototype.copyAsync = function(source, dest, options) {
  var self = this;

  // log.debug('Processing file "%s"', source);
  return readFilePairAsync(source, dest, options)
  .spread(function(sourceBuffer, destBuffer) {
    return writeDestFileAsync.call(self, dest, sourceBuffer, destBuffer, source);
  });

};

Generator.prototype.templateAsync = function(source, dest, options) {
  var self = this;

  // log.debug('Processing template "%s"', source);

  return readFilePairAsync(source, dest, options)
  .spread(function(sourceBuffer, destBuffer) {
    var template = self.engine(sourceBuffer.toString(), {props: self.props, pkg: self.pkg});
    return [new Buffer(template), destBuffer];
  })
  .spread(function(sourceBuffer, destBuffer) {
    return writeDestFileAsync.call(self, dest, sourceBuffer, destBuffer, source);
  }).catch(function(err) {
    log.error(err);
    throw err;
  });

};

module.exports = Generator;


// var util = require('util');
// var path = require('path');
// var yeoman = require('yeoman-generator');
// var Promise = require('bluebird');
// var nunjucksEngine = require('./nunjucks-engine');

// function Generator(args, options, config) {
//   var self = this;

//   options.engine = nunjucksEngine;
//   // options['skip-install'] = true;
//   // options.force = true;

//   yeoman.generators.Base.apply(self, arguments);

//   self.on('end', function() {
//     self.installDependencies({skipInstall: options['skip-install']});
//   });

//   self.pkg = JSON.parse(self.readFileAsString(path.join(__dirname, '../../package.json')));

//   var props = self.props = {};
//   self.promptAsync = function(questions) {
//     return new Promise(function(resolve, reject) {
//       self.prompt(questions, function(props) {
//         self._.extend(self.props, props);
//         resolve(self.props);
//       });
//     });
//   };

// }

// util.inherits(Generator, yeoman.generators.Base);

// module.exports = Generator;
