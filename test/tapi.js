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
  var READ_PASS = 'read-pass';
  var WRITE_PASS = 'write-pass';
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
    it('good registration', goodRegistration);
    it('bad registration', badRegistration);
    it('create store', createStore);
    it('open store - readonly', openStoreReadOnly);
    it('open store', openStore);
    
    function goodRegistration(done) {
      var appId = Math.random().toString(36);
      request(app)  
        .post(unauthPath + '/registerApp')
        .send({
          rootAppId: process.env.KVS_ROOT_APP_ID, 
          appId: appId,
        })        
        .expect(200)
        .end(function(err, res) {
          expect(res.body.result).to.be.equal('OK');
          // Second registration for same app should fail
          request(app)  
            .post(unauthPath + '/registerApp')
            .send({
              rootAppId: process.env.KVS_ROOT_APP_ID, 
              appId: appId,
            })        
            .end(function(err, res) {
              expect(res.body.error).to.be.equal('ALREADY_REGISTERED');
              if (err) return done(err);
              deregister(done);
            });
        });      
  
      function deregister(done) {
        request(app)  
          .post(unauthPath + '/deregisterApp')
          .send({
            rootAppId: process.env.KVS_ROOT_APP_ID, 
            appId: appId,
          })        
          .expect(200)
          .end(function(err, res) {  
              if (err) return done(err);
              done();
          });        
      }
    }
    function badRegistration(done) {
      // Can't register an app if you don't know the root app ID.
      var appId = Math.random().toString(36);
      request(app)  
        .post(unauthPath + '/registerApp')
        .send({
          rootAppId: 'BAD', 
          appId: appId,
        })        
        .end(function(err, res) {
          expect(res.body.error).to.be.equal('ACCESS_DENIED');
          done();
        });          
    }

    function createStore(done) {
      request(app)  
        .post(unauthPath + '/createStore')
        .send({
          appId: unitTestAppId,
          storeId: storeId,
          readPassword: READ_PASS,
          writePassword: WRITE_PASS
        })        
        .expect(200)
        .end(function(err, res) {  
          if (err) return done(err);        
          request(app)  
            .post(unauthPath + '/createStore')
            .send({
              appId: unitTestAppId,
              storeId: storeId,
              readPassword: READ_PASS,
              writePassword: WRITE_PASS
            })        
            .end(function(err, res) {
              expect(res.body.error).to.be.equal('STORE_ALREADY_EXISTS');
              done();
            });
        });
    }

    function openStoreReadOnly(done) {
      request(app)  
        .post(unauthPath + '/openStore')
        .send({
          appId: unitTestAppId,
          storeId: storeId,
          password: READ_PASS
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
                expect(res.body.error).to.be.equal('ACCESS_DENIED');
                request(app)
                .post(authPath + '/deleteStore')
                .set('Access-Token', accessToken)              
                .end(function(err, res) {      
                  expect(res.body.error).to.be.equal('ACCESS_DENIED');          
                  return done();
              });
            });
        });
    }

    function openStore(done) {
      request(app)  
        .post(unauthPath + '/openStore')
        .send({
          appId: unitTestAppId,
          storeId: storeId,
          password: WRITE_PASS
        })        
        .expect(200)
        .end(function(err, res) {  
            if (err) return done(err);
            var accessToken = res.body.result;
            request(app)  
              .post(authPath + '/putValue')
              .send({key: 'one', value: 'two'})
              .set('Access-Token', accessToken)
              .expect(200)              
              .end(function(err, res) {
                request(app)
                .post(authPath + '/deleteStore')
                .set('Access-Token', accessToken)
                .expect(200)                              
                .end(function(err, res) {      
                  return done();
              });
            });
        });
    }
    
  });
});