'use strict';

var Transform = require('stream').Transform;
var gutil = require('gulp-util');

module.exports = function(config) {
  
  gutil.log('Creating EB environment config');

  if (config) {
    
    var options = [];

    for (var k in config) {
      if (config.hasOwnProperty(k)) {
        options.push({
          Namespace: 'aws:elasticbeanstalk:application:environment',
          OptionName: k,
          Value: config[k]
        });
      }
    }

    var stream = new Transform({ objectMode: true });
    var contents = new Buffer(JSON.stringify({ option_settings: options }, null, 2));

    // Convert settings to EB format
    stream.push(new gutil.File({
      cwd: './',
      path: 'environmentvariables.config',
      contents: contents
    }));

  }

  return stream;

}

