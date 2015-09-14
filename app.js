var express = require('express');
var bodyParser = require('body-parser');
var _ = require('underscore');
var log = require('npmlog');
var api = require('./api');

module.exports = {
  create: createApp
};

function createApp() {
  var app = express();
  app.use(bodyParser.json());
  api.run(app);
  return app;
}
