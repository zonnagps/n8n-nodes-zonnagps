// Offline tests: webhook signature and compiled node descriptions (npm test builds first).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { verifyZonnaSignature, apiBase } = require('../dist/lib/signature.js');
const { ZonnaGps } = require('../dist/nodes/ZonnaGps/ZonnaGps.node.js');
const { ZonnaGpsTrigger } = require('../dist/nodes/ZonnaGpsTrigger/ZonnaGpsTrigger.node.js');
const { ZonnaGpsApi } = require('../dist/credentials/ZonnaGpsApi.credentials.js');

const secret = 's'.repeat(64);
const body = '{"id":"a304321c","event":"geofence.enter","data":{"id":12}}';
const sign = (t, payload = body, key = secret) => `t=${t},v1=${createHmac('sha256', key).update(`${t}.${payload}`).digest('hex')}`;

test('accepts a valid, recent signature', () => {
  const now = Date.now();
  assert.equal(verifyZonnaSignature(body, sign(Math.floor(now / 1000)), secret, 300, now), true);
});

test('rejects a tampered signature, changed body, wrong secret or old timestamp', () => {
  const now = Date.now();
  const t = Math.floor(now / 1000);
  assert.equal(verifyZonnaSignature(body, sign(t).replace(/.$/, '0'), secret, 300, now), false);
  assert.equal(verifyZonnaSignature(body + ' ', sign(t), secret, 300, now), false);
  assert.equal(verifyZonnaSignature(body, sign(t, body, 'other'), secret, 300, now), false);
  assert.equal(verifyZonnaSignature(body, sign(t - 600), secret, 300, now), false);
  assert.equal(verifyZonnaSignature(body, undefined, secret, 300, now), false);
});

test('uses the production base URL by default and the staging one when given', () => {
  assert.equal(apiBase(undefined), 'https://app.zonnagps.es/api/public/v1');
  assert.equal(apiBase('https://pruebas.app.zonnagps.es/'), 'https://pruebas.app.zonnagps.es/api/public/v1');
});

test('nodes and credential are well described', () => {
  const node = new ZonnaGps().description;
  assert.equal(node.name, 'zonnaGps');
  const resources = node.properties.find((p) => p.name === 'resource').options.map((o) => o.value);
  assert.deepEqual(resources.sort(), ['deca', 'driver', 'place', 'report', 'vehicle']);
  const trigger = new ZonnaGpsTrigger();
  assert.equal(trigger.description.webhooks[0].httpMethod, 'POST');
  const events = trigger.description.properties.find((p) => p.name === 'events').options.map((o) => o.value).sort();
  assert.deepEqual(events, ['alert.triggered', 'deca.issued', 'geofence.enter', 'geofence.exit', 'vehicle.offline']);
  for (const method of ['checkExists', 'create', 'delete']) assert.equal(typeof trigger.webhookMethods.default[method], 'function');
  const credential = new ZonnaGpsApi();
  assert.equal(credential.authenticate.properties.headers.Authorization, '=Bearer {{$credentials.apiKey}}');
});
