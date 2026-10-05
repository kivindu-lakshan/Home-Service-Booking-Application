/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const ts = require(path.join(root, 'node_modules/typescript'));
function load(file, dependencies) {
 const exports = {}; const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
 vm.runInNewContext(code, { exports, URL, require: name => { if (!(name in dependencies)) throw Error('Unexpected import ' + name); return dependencies[name]; } }); return exports;
}
const helper = load('src/utils/service-image.ts', { '@/api/client': { api: { defaults: { baseURL: 'http://192.168.1.10:3000/api' } } } });
const uri = '/api/services/images/11111111-2222-3333-4444-555555555555.png';
assert.equal(helper.serviceImageUri(uri), 'http://192.168.1.10:3000' + uri);
for (const invalid of [undefined, '', 'nonsense', 'file:///secret', 'data:image/png;base64,abc', 'javascript:alert(1)', 'https://user:password@example.com/a.png', '/api/services/images/../../.env']) assert.equal(helper.serviceImageUri(invalid), undefined);
assert.equal(helper.serviceImageUri('https://example.com/garden.png'), 'https://example.com/garden.png');
let failed = false;
const jsx = (type, props) => ({ type, props });
const ui = load('src/components/customer/CustomerUI.tsx', {
 'react': { useState: () => [failed, value => { failed = value; }] },
 'react/jsx-runtime': { jsx, jsxs: jsx },
 'expo-router': {},
 'react-native': { Image: 'Image', View: 'View', StyleSheet: { create: value => value } },
 'react-native-safe-area-context': {},
 '@/context/AuthContext': {},
 '@/context/AccountThemeContext': { useAccountStyles: () => style => style },
 '@/components/settings/AccountText': { AccountText: 'Text' },
 '@/components/profile/ProfileIcon': {}, '@/components/ui': {}, '@/components/DataState': {}, '@/utils/service-image': helper,
});
let image = ui.CatalogueImage({ uri, label: 'Garden' }); assert.equal(image.type, 'Image'); assert.equal(image.props.resizeMode, 'cover'); assert.equal(image.props.source.uri, 'http://192.168.1.10:3000' + uri);
const dimensions = image.props.style;
image.props.onError(); const fallback = ui.CatalogueImage({ uri, label: 'Garden' }); assert.equal(fallback.type, 'View'); assert.equal(fallback.props.style[0], dimensions);
failed = false; assert.equal(ui.CatalogueImage({ label: 'No image' }).type, 'View'); assert.equal(ui.CatalogueImage({ uri: 'invalid', label: 'Broken' }).type, 'View');
assert.equal(dimensions.height, 190); assert.equal(dimensions.borderRadius, 18);
console.log('PASS URL resolution, invalid/missing image fallback, load-error fallback, cover sizing and unchanged image dimensions.');
