'use strict';

var AWS = require('aws-sdk');
var fs = require('fs');
var Q = require('q');
var _ = require('lodash');
var gutil = require('gulp-util');
var through = require('through2');
var runInNewContext = require('vm').runInNewContext;

module.exports = function(config) {
  
  config = _.extend({
    region: 'us-east-1'
  }, config);

  function configure(file, enc, callback) {
    
    if (config.profile) {
      AWS.config.credentials = new AWS.SharedIniFileCredentials({ profile: config.profile });
      gutil.log('Using credentials from profile \'' + config.profile + '\'');
    }

    var iam = new AWS.IAM();

    iam.getUser({}, function(err, data) {

      if (err) {
        callback(new gutil.PluginError('gulp-eb-config', err));
      } else {

        // Execute module to get settings variables
        var module = { exports: {} };
        if (file && file.contents) {
          runInNewContext(file.contents, { module: module, exports: module.exports, require: require });
        }

        // Add hardcoded settings
        if (config.settings) {
          _.each(config.settings, function(v, k) {
            module.exports[k] = v;
          });
        }

        // Convert settings to EB format
        var settings = _.keys(module.exports).map((k) => ({
          Namespace: 'aws:elasticbeanstalk:application:environment',
          OptionName: k,
          Value: module.exports[k]
        }));

        var eb = new AWS.ElasticBeanstalk({ region: config.region });

        gutil.log('Updating environment \'' + config.environment + '\' configuration with ' + settings.length + ' settings');
        eb.updateEnvironment({
          EnvironmentName: config.environment,
          OptionSettings: settings
        }, function (err, data) {
          if (err) {
            callback(new gutil.PluginError('gulp-eb-config', err));
          } else {
            gutil.log('Environment update running, please check AWS console for progress');
            callback();
          }
        });

      }

    });

  }

  var piped = through.obj(configure);

  piped.run = function(cb) {
    configure(null, null, cb);
  }

  return piped;

}

