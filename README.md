# akvstore
Authenticated key/value store built on redis

AKVStore provides a basic key-value store with super light authentication.

## Configuration
Set the following environment variables
* AKVS_ROOT_APP_ID
* AKVS_API_PORT
* AKVS_API_BASE_URI
* AKVS_PASSWORD_SALT
* REDIS_HOST
* REDIS_PORT
* REDIS_PW


##API
### registerApp(rootAppId, appId)
Register a new application. The appId is must be unique within the service. Only clients with the knowledge of the secret rootAppId have access to create applications.

### deregisterApp(rootAppId, appId)
Deregister an application and delete all associated stores.

### createStore(appId, storeId, readPassword, writePassword)
Create a new store for a particular application. If writePassword is optional. If it is not included then readPassword provies read and write access to the store.

### openStore(appId, storeId, password)
Open a store. Password will provide either read only or read/write access depending on how store was created and which password is supplied. Returns a new accessToken. 

### deleteStore(appId, storeId)
Delete a store and all of its data. 
Authenticated method: set access-token header.

### getValue(key)
Get a value for a particular key.
Authenticated method: set access-token header.

### putValue(key, value)
Add new value or replace an existing value.
Authenticated method: set access-token header.

### deleteKey(key)
Delete a value.
Authenticated method: set access-token header.
