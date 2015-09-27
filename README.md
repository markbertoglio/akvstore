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
### registerApp(rootAppId)
Register a new application. Requires knowledge of secret rootAppId.

*** deregisterApp(rootAppId, appId)
Deregister application and delete all associated stores.

*** createStore(appId, storeId, readPassword, writePassword)
Create a store for a particular application.

*** openStore(appId, storeId, password)
Open a store. Password will provide either read only or read/write access

*** deleteStore(appId, storeId)

*** getValue(key)

*** putValue(key, value)

*** deleteKey(key)
