#!/usr/bin/env node

var _ = require('lodash');
var Q = require('q');

var ProgressBar = require('progress');

var program = require('./lib/program');

if (!program.directory) {
  console.error('Directory is required!');
  program.help();

  process.exit(1);
}

var OpenSubtitles = require('./lib/openSubtitles');
var api = new OpenSubtitles();

var findMovies = require('./lib/findMovies');
var collectFileStats = require('./lib/collectFileStats');
var collectInfo = require('./lib/collectInfo');
var collectDetails = require('./lib/collectDetails');
var printMovie = require('./lib/printMovie');

var buildProgressBar = function(format, total) {
  var bar = new ProgressBar(format, { total: total });
  return {
    tick: function() { bar.tick() }
  }
};

Q(program.directory).then(function(directory) {
  return findMovies(program.formats, directory);
}).then(function(files) {
  console.log('Found', files.length, 'movies');
  var bar = buildProgressBar('Loading files                 [:bar] :percent :etas', files.length);
  return collectFileStats(files).progress(bar.tick);
}).then(function(stats) {
  var bar = buildProgressBar('Trying to find movies         [:bar] :percent :etas', stats.length);
  return collectInfo(api, stats).progress(bar.tick);
}).then(function(stats) {
  var bar = buildProgressBar('Trying to fetch movie details [:bar] :percent :etas', stats.length);
  return collectDetails(api, stats).progress(bar.tick);
}).then(function(stats) {
  // filter, sort etc.
  return _.chain(stats)
    .select(function(stat) { return stat.movie && stat.movie.kind !== 'episode'; })
    .sortBy(function(stat) { return parseFloat(stat.movie.rating) })
    .reverse()
    .value();
}).then(function(stats) {
  _.each(stats, printMovie);
}).catch(function(err) {
  console.log('err:', err);
  process.exit(1);
}).done();
