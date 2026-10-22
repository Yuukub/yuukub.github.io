import assert from 'node:assert/strict';
import test from 'node:test';
import { detectFormat, importFile } from '../src/app/[locale]/tools/api-tester/lib/importExport.ts';

const now = 1_700_000_000_000;
const collection = {
    info: { name: 'Example API', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json', description: { content: 'API examples' } },
    item: [{ name: 'Users', item: [{
        name: 'Create',
        request: {
            method: 'post',
            url: { raw: 'https://example.test/users?limit=5', query: [{ key: 'limit', value: 5, description: { content: 'Page size' } }] },
            header: [{ key: 'X-Test', value: 'test', disabled: true }],
            body: { mode: 'raw', raw: '{"name":"Alice"}', options: { raw: { language: 'json' } } },
            auth: { type: 'bearer', bearer: [{ key: 'token', value: 'token-value' }] },
        },
    }] }],
};

test('Postman folders, URL parameters, descriptions, JSON body and bearer auth survive import', () => {
    assert.equal(detectFormat(collection), 'postman-collection');
    const result = importFile(collection, now);
    const [request] = result.requests;
    assert.equal(result.collections[0].description, 'API examples');
    assert.equal(request.name, 'Users / Create');
    assert.equal(request.method, 'POST');
    assert.equal(request.url, 'https://example.test/users');
    assert.equal(request.params[0].value, '5');
    assert.equal(request.params[0].description, 'Page size');
    assert.equal(request.headers[0].enabled, false);
    assert.deepEqual(request.body, { mode: 'json', raw: '{"name":"Alice"}', rawLang: 'json' });
    assert.deepEqual(request.auth, { type: 'bearer', bearerToken: 'token-value' });
    assert.equal(request.collectionId, result.collections[0].id);
    assert.deepEqual(result.collections[0].requestIds, [request.id]);
});

test('Postman string requests, form bodies and object/array auth blocks remain supported', () => {
    const input = structuredClone(collection);
    input.item = [
        { name: 'String URL', request: 'https://example.test/string' },
        { name: 'Form', request: { body: { mode: 'formdata', formdata: [{ key: 'count', value: 3 }] }, auth: { type: 'basic', basic: { username: 'user', password: 'pass' } } } },
        { name: 'Encoded', request: { body: { mode: 'urlencoded', urlencoded: [{ key: 'a', value: 'b', disabled: true }] }, auth: { type: 'apikey', apikey: [{ key: 'key', value: 'X-Key' }, { key: 'value', value: 'secret' }, { key: 'in', value: 'query' }] } } },
        { name: 'Unsupported auth', request: { auth: { type: 'oauth2' } } },
        { name: 'Missing request' },
    ];
    const result = importFile(input, now);
    assert.equal(result.requests[0].url, 'https://example.test/string');
    assert.equal(result.requests[0].method, 'GET');
    assert.equal(result.requests[1].body.mode, 'form-data');
    assert.equal(result.requests[1].body.formData[0].value, '3');
    assert.deepEqual(result.requests[1].auth, { type: 'basic', basicUser: 'user', basicPass: 'pass' });
    assert.equal(result.requests[2].body.mode, 'x-www-form-urlencoded');
    assert.equal(result.requests[2].body.formData[0].enabled, false);
    assert.equal(result.requests[2].auth.apiKeyIn, 'query');
    assert.equal(result.warnings.length, 1);
    assert.equal(result.skipped.length, 1);
});

test('Postman environment values are normalized without losing enabled flags', () => {
    const result = importFile({ name: 'Local', values: [{ key: 'port', value: 3000 }, { key: 'disabled', value: false, enabled: false }] }, now);
    assert.equal(result.environments[0].name, 'Local');
    assert.deepEqual(result.environments[0].variables.map(({key,value,enabled}) => ({key,value,enabled})), [
        { key: 'port', value: '3000', enabled: true },
        { key: 'disabled', value: 'false', enabled: false },
    ]);
});

test('Native backups round-trip collections, requests, auth and environments', () => {
    const imported = importFile(collection, now);
    const env = importFile({ name: 'Local', values: [{ key: 'host', value: 'example.test' }] }, now);
    const backup = { apiTesterBackupVersion: 1, collections: imported.collections, requests: imported.requests, environments: env.environments };
    const restored = importFile(JSON.parse(JSON.stringify(backup)), now);
    assert.deepEqual(restored, JSON.parse(JSON.stringify({ collections: backup.collections, requests: backup.requests, environments: backup.environments, warnings: [], skipped: [] })));
    assert.deepEqual(importFile({ apiTesterBackupVersion: 1, collections: [], requests: [], environments: [] }, now).requests, []);
});

test('Malformed native rows are rejected before they reach the editable request UI', () => {
    const imported = importFile(collection, now);
    const backup = { apiTesterBackupVersion: 1, collections: imported.collections, requests: imported.requests, environments: [] };
    for (const mutate of [
        b => { b.requests[0].headers[0].value = {}; },
        b => { b.requests[0].body.mode = 'unsupported'; },
        b => { b.requests[0].auth.bearerToken = 123; },
        b => { b.collections[0].requestIds = 'invalid'; },
        b => { b.environments = [{ id: 'env', name: 'Invalid', variables: [null] }]; },
    ]) {
        const invalid = structuredClone(backup);
        mutate(invalid);
        assert.throws(() => importFile(invalid, now), /INVALID_FORMAT/);
    }
});

test('Unknown JSON values and incomplete backup files fail with INVALID_FORMAT', () => {
    for (const input of [null, undefined, true, 42, 'text', [], {}, { apiTesterBackupVersion: 1 }]) {
        assert.throws(() => importFile(input, now), /INVALID_FORMAT/);
    }
});
