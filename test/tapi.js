require('../localenv');

var expect = require('expect.js');
var request = require('supertest');
var appx = require('../app');

describe('Web Service API', function() {
  var authPath = process.env.KVS_API_BASE_URI;
  var unauthPath = process.env.KVS_API_BASE_URI + '/unauth';
  var app = appx.create();
  var contentType = {'Content-Type': 'application/json'};
  var unitTestAppId = 'the warm smell of colitas';
  var storeId = Math.random().toString(18);
  setup();
  
  function setup() {
    request(app)  
      .post(unauthPath + '/registerApp')
      .send({
        rootAppId: process.env.KVS_ROOT_APP_ID, 
        appId: unitTestAppId,
      })        
      .end(function(err, res) {  
      });          
  }
  
  describe('Miscellaneous', function() {
    it('registration', appRegistration);
    it('create store', createStore);
    it('open store', openStore);
    
    function appRegistration(done) {
      var appId = Math.random().toString(36);
      request(app)  
        .post(unauthPath + '/registerApp')
        .send({
          rootAppId: process.env.KVS_ROOT_APP_ID, 
          appId: appId,
        })        
        .expect(200)
        .end(function(err, res) {  
            if (err) return done(err);
            deregister();
        });      
  
      function deregister() {
        request(app)  
          .post(unauthPath + '/deregisterApp')
          .send({
            rootAppId: process.env.KVS_ROOT_APP_ID, 
            appId: appId,
          })        
          .expect(200)
          .end(function(err, res) {  
              if (err) return done(err);
              console.log(res.body);
              done();
          });        
      }    
    }
        
    function registerApp(done) {
      request(app)  
        .post(unauthPath + '/registerApp')
        .send({
          rootAppId: process.env.KVS_ROOT_APP_ID, 
          appId: 'funky cold medina',
        })        
        .expect(200)
        .end(function(err, res) {  
            if (err) return done(err);
            console.log(res.body);
            done();
        });      
    }
    
    function createStore(done) {
      request(app)  
        .post(unauthPath + '/createStore')
        .send({
          appId: unitTestAppId,
          storeId: storeId,
          readPassword: 'READIT',
          writePassword: 'WRITEIT'
        })        
        .expect(200)
        .end(function(err, res) {  
            if (err) return done(err);
            console.log(res.body);
            done();
        });
    }

    function openStore(done) {
      request(app)  
        .post(unauthPath + '/openStore')
        .send({
          appId: unitTestAppId,
          storeId: storeId,
          password: 'WRITEIT'
        })        
        .expect(200)
        .end(function(err, res) {  
            if (err) return done(err);
            var accessToken = res.body.result;
            request(app)  
              .post(authPath + '/putValue')
              .send({key: 'one', value: 'two'})
              .set('Access-Token', accessToken)              
              .end(function(err, res) {
                console.log("EEREWR", err, res.body)
                request(app)
                .post(authPath + '/deleteStore')
                .set('Access-Token', accessToken)              
                .end(function(err, res) {                
                  return done();
              });
            });
        });
    }
    
  });
});