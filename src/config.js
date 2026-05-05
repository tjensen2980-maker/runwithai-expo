// src/config.js
// Server-URL baseret pa environment.
// __DEV__ er React Native global - true i Expo Go/dev, false i App Store builds.

const PRODUCTION_SERVER = 'https://runwithai-server-production.up.railway.app';
const STAGING_SERVER = 'https://runwithai-server-staging.up.railway.app';

export const SERVER = __DEV__ ? STAGING_SERVER : PRODUCTION_SERVER;
export const IS_STAGING = __DEV__;
export const PRODUCTION_URL = PRODUCTION_SERVER;
export const STAGING_URL = STAGING_SERVER;
