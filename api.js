var _ = require('underscore');
var log = require('npmlog');
var bcrypt = require('bcrypt');
var redis = require('stools').redis;
var fetch = require('stools').fetch;

log.level = 'warn';

var LP = "api";

var OBJ_REGISTERED_APP = ["appreg", process.env.AKVS_ROOT_APP_ID].join('/');
var OBJ_APP_CREDS = "appcreds";
var OBJ_ACCESS_TOKENS = "accesstokens";

module.exports = {
  run: run
};

var unauthUrls = [
  ['registerApp', registerApp],
  ['deregisterApp', deregisterApp],  
  ['createStore', createStore],
  ['openStore', openStore]
];

var authUrls = [
  ['deleteStore', deleteStore],  
  ['getValue', getValue],
  ['putValue', putValue],
  ['deleteValue', deleteValue]
];

function run(app) {  
  var server = app.listen(process.env.AKVS_API_PORT, function () {
    var port = server.address().port;
    log.info(LP, "listening on port %d", port);
  });

  _.each(unauthUrls, function(entry) {
    var url = [process.env.AKVS_API_BASE_URI, 'unauth', entry[0]].join('/');
    app.all(url, logRequest, entry[1]);
  });

  _.each(authUrls, function(entry) {
    var url = [process.env.AKVS_API_BASE_URI, entry[0]].join('/');
    app.all(url, logRequest, setAccess, entry[1]);
  });
}

function setAccess(request, response, next) {
  request.accessMode = null;
  var accessToken = request.headers['access-token'];
  if (!accessToken) return next();  
  redis.getObj(OBJ_ACCESS_TOKENS, accessToken)  
    .onError(onError)
    .on(onGetAccess)
    ();   
  
  function onGetAccess(err, access) {
    if (err) return onError(err);
    request.access = access;
    return next();
  }
    
  function onError(err) {
    sendError(response, err);
  }
}

function logRequest(request, response, next) {
  var end = response.end;
  response.end = function(chunk, encoding) {
    response.end = end;
    var ret = response.end(chunk, encoding);
    if (request.body && request.body.password) { 
      request.body.password = 'XXXXXXXX';
    }
    var res = chunk.toString('utf8');
    log.http(LP, "req: %s, res: %s", JSON.stringify({url: request.originalUrl, param: request.body}), res);
    return ret;
  };
  return next();
}

function registerApp(request, response) {
  var userData = request.body;
  if (!userData.rootAppId || !userData.rootAppId) {
    return sendError(response, "error: missing parameter");
  }
  
  if (userData.rootAppId != process.env.AKVS_ROOT_APP_ID) {
    return sendError(response, "error: access denied");
  }
  
  redis.getObj(OBJ_REGISTERED_APP, userData.appId)
    .onError(standardResponse.bind(response))
    .on(onGet)
  ();
  
  function onGet(err, result) {
    if (result) {
      return standardResponse(response, "error: app already registered");
    }
    
    redis.setObj(OBJ_REGISTERED_APP, userData.appId, {created: Date.now()})
      .onError(standardResponse.bind(response))
      .on(onSet)
    ();
  }
  
  function onSet(err, result) {
    return standardResponse(response, err, result);
  }
}

function deregisterApp(request, response) {
  var userData = request.body;
  if (!userData.rootAppId || !userData.rootAppId) {
    return sendError(response, "error: missing parameter");
  }
  
  if (userData.rootAppId != process.env.AKVS_ROOT_APP_ID) {
    return sendError(response, "error: access denied");
  }
  
  redis.delObj(OBJ_REGISTERED_APP, userData.appId)
    .onError(standardResponse.bind(response))
    .on(onDelAppId)
  ();
  
  function onDelAppId(err, result) {
    return standardResponse(response, null, result);
  }
}

function createStore(request, response) {
  var userData = request.body;
  if (!userData.appId || !userData.storeId || !userData.readPassword) {
    return sendError(response, "error: missing parameter");
  }
  
  var storeCredKey = userData.appId + userData.storeId;
  
  redis.getObj(OBJ_REGISTERED_APP, userData.appId)  
    .onError(standardResponse.bind(response))
    .on(onGetReg)
  ();
  
  function onGetReg(err, result) {
    if (!result) {
      return standardResponse(response, "error: app not registered");
    }
    
    redis.getObj(OBJ_APP_CREDS, storeCredKey)  
      .onError(standardResponse.bind(response))
      .on(onGetCreds)
    ();    
  }
  
  function onGetCreds(err, result) {
    if (result) {
      return standardResponse(response, "error: store already exists");
    } 
    var readPwHash = userData.readPassword && bcrypt.hashSync(userData.readPassword, process.env.AKVS_PASSWORD_SALT);
    var writePwHash = userData.writePassword && bcrypt.hashSync(userData.writePassword, process.env.AKVS_PASSWORD_SALT);    
    var storeCreds = {
      storeKey: Math.random().toString(36),
      readPwHash: readPwHash, 
      writePwHash: writePwHash, 
      created: Date.now()
    }
  
    redis.setObj(OBJ_APP_CREDS, storeCredKey, storeCreds)
      .onError(standardResponse.bind(response))
      .on(onSetCreds)
    ();    
  }
  
  function onSetCreds(err, result) {
    return standardResponse(response, err, result);
  }  
}

function getModeAndStoreKey(appId, storeId, password, done) {
  var storeCredKey = appId + storeId;
  redis.getObj(OBJ_APP_CREDS, storeCredKey)  
    .onError(done)
    .on(onGetCreds)
    ();    
  
  function onGetCreds(err, storeCreds) {
    if (!storeCreds) {
      return done("error: store not found");
    }
    var mode = null;
    if (storeCreds.writePwHash) {
      if (bcrypt.compareSync(password, storeCreds.writePwHash)) {
        mode = 'rw';
      } else if (bcrypt.compareSync(password, storeCreds.readPwHash)) {
        mode = 'r';
      }
    } else if (storeCreds.readPwHash) {
      if (bcrypt.compareSync(password, storeCreds.readPwHash)) {
        mode = 'rw';
      }
    } else {
      // no password
      mode = 'rw';
    }
    return done(null, {mode: mode, storeKey: storeCreds.storeKey} );
  }
}

function openStore(request, response) {
  var userData = request.body;
  if (!userData.appId || !userData.storeId || !userData.password) {
    return sendError(response, "error: missing parameter");
  }
  getModeAndStoreKey(userData.appId, userData.storeId, userData.password, onGetMode);
  
  function onGetMode(err, result) {
    if (err) return standardResponse(response, err);
    if (!result.mode) {
      return sendError(response, "error: access denied");
    }
    
    var accessToken = Math.random().toString(36); 
    var access = {
      mode: result.mode,
      storeKey: result.storeKey,
      appId: userData.appId,
      storeId: userData.storeId
    };
    
    redis.setObj(OBJ_ACCESS_TOKENS, accessToken, access)
      .onError(standardResponse.bind(response))
      .on(onSetAccess)
    ();
    
    function onSetAccess(err, result) {
      return standardResponse(response, err, accessToken);
    } 
  }    
}

function deleteStore(request, response) {
  if (!request.access || request.access.mode != 'r') {
    return standardResponse(response, "error: access denied");
  }
  var storeCredKey = request.access.appId + request.access.storeId;
  redis.delObj(OBJ_APP_CREDS, storeCredKey)  
    .onError(onDelCreds)
    .on(onDelCreds)
    ();    
    
  function onDelCreds(err, result) {
    
    // TODO: delete all keys associated with this store.
    
    return standardResponse(response, err, result);
  }
}

function getValue(request, response) {
  if (!request.access || request.access.mode != 'rw') {
    return standardResponse(response, "error: access denied");
  }
}

function putValue(request, response) {
  if (!request.access || request.access.mode != 'rw') {
    return standardResponse(response, "error: access denied");
  }
  var userData = request.body;
  if (!userData.key) {
    return sendError(response, "error: missing parameter");
  }
  
  redis.setObj(request.access.storeKey, userData.key, userData.value)
    .onError(standardResponse.bind(response))
    .on(onSetObj)
  ();
  
  function onSetObj(err, result) {
    return standardResponse(response, err, result);
  }   
}

function deleteValue(request, response) {
  if (!request.access || request.access.mode != 'rw') {
    return standardResponse(response, "error: access denied");
  }
}

function standardResponse(response, err, result) {
  if (err) return sendError(response, JSON.stringify(err));
  sendResult(response, result);
}

function sendResult(response, result) {
  if (_.isArray(result)) result = {data: result};
  return response.json({result: result});
}

function sendError(response, msg) {
  return response.status(400).json({err: msg});
}


