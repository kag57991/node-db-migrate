var fs = require('fs');
var path = require('path');
var config = require('./config');
var log = require('./log');
var Util = require('util');
var Skeleton = require('./skeleton');

var filesRegEx = /\.js$/;
var coffeeSupported = false;
var coffeeModule = null;
try {
  coffeeModule = require('coffee-script');
  if (coffeeModule && coffeeModule.register) coffeeModule.register();
  coffeeSupported = true;
  filesRegEx = /\.(js|coffee)$/;
} catch (e) {}

Util.inherits(Seed, Skeleton);

function Seed() {
  if (arguments.length >= 3) {
    this.title = arguments[0];
    this.date = arguments[2];
    this.name = this.formatName(this.title, this.date);
    this.path = this.formatPath(arguments[1], this.name);
    this.templateType = arguments[3];
  } else if (arguments.length == 1) {
    this.path = arguments[0];
    this.name = this.parseName(this.path);
    this.date = this.parseDate(this.name);
    this.title = this.parseTitle(this.name);
  }
};

Seed.prototype = {

  up: function(db, static, callback) {

    if(static) {

      var seed = require(this.path);

      seed.truncate(function(err) {

        if(err) {

          console.log('Error while truncating static seed.');
          callback(err);
        }
        else {

          seed.seed(function(err) {

            if(err) {

              console.log('Error while seeding static seed.');
              callback(err);
            }
            else {

              callback(null);
            }
          });
        }
      });
    }
    else {

      this._up(db, callback);
    }
  },

  down: function(db, static, callback) {

    if(static) {

      var seed = require(this.path);

      seed.truncate(function(err) {

        if(err) {

          console.log('Error while truncating static seed.');
          callback(err);
        }
        else {

          callback(null);
        }
      });
    }
    else {

      this._down(db, callback);
    }
  },

  loadFromFilesystem: function(dir, callback) {
    log.verbose('loading seeds from dir', dir);
    fs.readdir(dir, function(err, files) {
      if (err) { callback(err); return; }
      var coffeeWarn = true;
      files = files.filter(function(file) {
        if (coffeeWarn && !coffeeSupported && /\.coffee$/.test(file)) {
          log.warn('CoffeeScript not installed');
          coffeeWarn = false;
        }
        return filesRegEx.test(file);
      });
      var seeds = files.sort().map(function(file) {
        return new Seed(path.join(dir, file));
      });
      callback(null, seeds);
    });
  },

  loadFromDatabase: function(dir, driver, callback) {
    log.verbose('loading seeds from database');
    driver.allLoadedseeds(function(err, dbResults) {
      if (err && !global.dryRun) { callback(err); return; }
      else if (err && global.dryRun) {
        dbResults = []
      }
      var seeds = dbResults.filter(function(result) {
        return result.name.substr(0,result.name.lastIndexOf('/')) === global.matching;
      }).map(function(result) {
        return new Seed(path.join(dir, result.name));
      });

      callback(null, seeds);
    });
  }

};

module.exports = Seed;