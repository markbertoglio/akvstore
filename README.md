# akvstore
Authenticated key/value store built on redis.

AKVStore provides a basic key-value store with super light authentication. Create a readonly store for shared application data like application settings and connection. Create a read/write store for client specific data.

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
Register a new application. The appId must be unique within the service. Only clients with knowledge of the secret rootAppId have access to create applications.

### deregisterApp(rootAppId, appId)
Deregister an application and delete all associated stores.

### createStore(appId, storeId, readPassword, writePassword)
Create a new store for a particular application. writePassword is optional. If it is not included then readPassword provides read/write access to the store.

### openStore(appId, storeId, password)
Open a store. Password will provide either read only or read/write access depending on how store was created and which password is supplied. Returns a new access token. 

### * deleteStore(appId, storeId)
Delete a store and all of its data. 

### * getValue(key)
Get a value for a particular key.

### * putValue(key, value)
Add new value or replace an existing value.

### * deleteValue(key)
Delete a value.

##### * Authenticated method. Set 'access-token' header with a a valid access token.
