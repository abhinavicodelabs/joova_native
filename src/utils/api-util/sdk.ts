const http = require('http');
const https = require('https');
const Decimal = require('decimal.js');
const log = require('../log');
const sharetribeSdk = require('sharetribe-flex-sdk');
const sharetribeIntegrationSdk = require('sharetribe-flex-integration-sdk');

const CLIENT_ID = process.env.REACT_APP_SHARETRIBE_SDK_CLIENT_ID;
const CLIENT_SECRET = process.env.SHARETRIBE_SDK_CLIENT_SECRET;
const USING_SSL = process.env.REACT_APP_SHARETRIBE_USING_SSL === 'true';
const TRANSIT_VERBOSE = process.env.REACT_APP_SHARETRIBE_SDK_TRANSIT_VERBOSE === 'true';

const BASE_URL = process.env.REACT_APP_SHARETRIBE_SDK_BASE_URL;
const ASSET_CDN_BASE_URL = process.env.REACT_APP_SHARETRIBE_SDK_ASSET_CDN_BASE_URL;

// Application type handlers for JS SDK.
//
// NOTE: keep in sync with `typeHandlers` in `src/util/api.js`
const typeHandlers = [
  // Use Decimal type instead of SDK's BigDecimal.
  {
    type: sharetribeSdk.types.BigDecimal,
    customType: Decimal,
    writer: (v:any) => new sharetribeSdk.types.BigDecimal(v.toString()),
    reader: (v:any) => new Decimal(v.value),
  },
];
exports.typeHandlers = typeHandlers;

const baseUrlMaybe = BASE_URL ? { baseUrl: BASE_URL } : {};
const assetCdnBaseUrlMaybe = ASSET_CDN_BASE_URL ? { assetCdnBaseUrl: ASSET_CDN_BASE_URL } : {};

const httpAgent = new http.Agent({ keepAlive: true });
const httpsAgent = new https.Agent({ keepAlive: true });

const memoryStore = (token:any) => {
  const store = sharetribeSdk.tokenStore.memoryStore();
  store.setToken(token);
  return store;
};

// Read the user token from the request cookie
const getUserToken = (req:any) => {
  const cookieTokenStore = sharetribeSdk.tokenStore.expressCookieStore({
    clientId: CLIENT_ID,
    req,
    secure: USING_SSL,
  });
  return cookieTokenStore.getToken();
};

exports.serialize = (data:any) => {
  return sharetribeSdk.transit.write(data, { typeHandlers, verbose: TRANSIT_VERBOSE });
};

exports.deserialize = (str:any) => {
  return sharetribeSdk.transit.read(str, { typeHandlers });
};

exports.handleError = (res:any, error:any):any => {
  log.error(error, 'local-api-request-failed', error.data);

  if (error.status && error.statusText && error.data) {
    const { status, statusText, data } = error;

    // JS SDK error
    res
      .status(error.status)
      .json({
        name: 'Local API request failed',
        status,
        statusText,
        data,
      })
      .end();
  } else {
    res
      .status(500)
      .json({ error: error.message })
      .end();
  }
};

exports.getSdk = (req:any, res:any) => {
  return sharetribeSdk.createInstance({
    transitVerbose: TRANSIT_VERBOSE,
    clientId: CLIENT_ID,
    httpAgent,
    httpsAgent,
    tokenStore: sharetribeSdk.tokenStore.expressCookieStore({
      clientId: CLIENT_ID,
      req,
      res,
      secure: USING_SSL,
    }),
    typeHandlers,
    ...baseUrlMaybe,
    ...assetCdnBaseUrlMaybe,
  });
};

exports.getTrustedSdk = (req:any) => {
  const userToken = getUserToken(req);

  // Initiate an SDK instance for token exchange
  const sdk = sharetribeSdk.createInstance({
    transitVerbose: TRANSIT_VERBOSE,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    httpAgent,
    httpsAgent,
    tokenStore: memoryStore(userToken),
    typeHandlers,
    ...baseUrlMaybe,
  });

  // Perform a token exchange
  return sdk.exchangeToken().then((response:any) => {
    // Setup a trusted sdk with the token we got from the exchange:
    const trustedToken = response.data;

    return sharetribeSdk.createInstance({
      transitVerbose: TRANSIT_VERBOSE,

      // We don't need CLIENT_SECRET here anymore
      clientId: CLIENT_ID,

      // Important! Do not use a cookieTokenStore here but a memoryStore
      // instead so that we don't leak the token back to browser client.
      tokenStore: memoryStore(trustedToken),

      httpAgent,
      httpsAgent,
      typeHandlers,
      ...baseUrlMaybe,
    });
  });
};

// Fetch commission asset with 'latest' alias.
exports.fetchCommission = (sdk:any) => {
  return sdk
    .assetsByAlias({ paths: ['transactions/commission.json'], alias: 'latest' })
    .then((response:any) => {
      // Let's throw an error if we can't fetch commission for some reason
      const commissionAsset = response?.data?.data?.[0];
      if (!commissionAsset) {
        const message = 'Insufficient pricing configuration set.';
        const error:any = new Error(message);
        error.status = 400;
        error.statusText = message;
        error.data = {};
        throw error;
      }
      return response;
    });
};

// Integration API 
exports.getISdk = () => {
  return sharetribeIntegrationSdk.createInstance({
    clientId: process.env.ISDK_CLIENT_ID,
    clientSecret: process.env.ISDK_CLIENT_SECRET,
  });
};
