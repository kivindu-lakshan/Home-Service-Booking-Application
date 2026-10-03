/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
// Exercise real screen event handlers while replacing network calls and hooks.
function harness(data, overrides = {}) {
  const navigation = [], calls = [], cells = []; let cursor = 0;
  const auth = { user: { fullName: 'Test Customer', role: 'customer' }, loading: false, ...overrides.auth };
  const params = { serviceId: 'selected-service', providerId: 'selected-provider' };
  const router = { push: href => navigation.push(['push', href]), replace: href => navigation.push(['replace', href]), canGoBack: () => false };
  const react = { useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = initial; return [cells[i], v => { cells[i] = v; }]; }, useRef(initial) { const i = cursor++; if (!(i in cells)) cells[i] = { current: initial }; return cells[i]; }, useCallback: fn => fn, useEffect: () => {} };
  const native = new Proxy({ StyleSheet: { create: s => s }, Platform: { OS: 'web' } }, { get: (o,k) => o[k] || k });
  const load = file => {
    const output = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {};
    const requireMock = name => {
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type,props) => ({ type,props }), jsxs: (type,props) => ({ type,props }) };
      if (name === 'react-native') return native;
      if (name === 'expo-router') return { router, Redirect: 'Redirect', useLocalSearchParams: () => params };
      if (name === '@/context/AuthContext') return { useAuth: () => auth };
      if (name === '@/context/AccountThemeContext') return { useAccountStyles: () => s => s };
      if (name === '@/hooks/useCatalogueData') return { useCatalogueData: () => ({ user: auth.user, data, loading: false, refreshing: false, error: '', load: () => {} }) };
      if (name === '@/api/catalogue') return { requestBooking: async payload => { calls.push(payload); if (overrides.requestBooking) return overrides.requestBooking(payload); return { _id: 'created-booking' }; }, catalogueError: () => 'Request failed' };
      if (name === '@/components/customer/CustomerUI') return { css: {}, priceLabel: p => String(p), CustomerPage: 'CustomerPage', CatalogueState: 'CatalogueState', CatalogueImage: 'CatalogueImage', ProviderCard: 'ProviderCard' };
      return new Proxy({ __esModule: true, default: name }, { get: (o,k) => o[k] || k });
    };
    vm.runInNewContext(output, { exports, require: requireMock, console }); return exports;
  };
  return { load, render(component, props = {}) { cursor = 0; return component(props); }, navigation, calls };
}
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes); return [tree, ...nodes(tree.props?.children)]; }
function find(tree, key, value) { const node = nodes(tree).find(n => n.props?.[key] === value); assert.ok(node, `${key}=${value}`); return node; }
const flush = () => new Promise(resolve => setImmediate(resolve));
test('customer home is shown at the existing post-login destination', () => {
  const h = harness(null); const tree = h.render(h.load('app/index.tsx').default); assert.equal(tree.type, '@/components/customer/CustomerHome');
});
for (const role of ['admin', 'provider']) test(`${role} opens its role dashboard`, () => {
  const h = harness(null, { auth: { user: { role, fullName: 'Test', email: 'test@example.invalid' } } }); const tree = h.render(h.load('app/index.tsx').default); assert.equal(tree.type, 'Redirect'); assert.equal(tree.props.href, role === 'admin' ? '/admin/home' : '/provider/dashboard');
});
test('category selection passes the database category ID', () => {
  const h = harness(null); const tree = h.render(h.load('components/customer/CustomerHome.tsx').CategoryTiles, { categories: [{ _id: 'database-category', name: 'Existing category' }] });
  nodes(tree).find(n => n.props?.onPress).props.onPress(); assert.equal(h.navigation[0][1].pathname, '/customer/services'); assert.equal(h.navigation[0][1].params.categoryId, 'database-category');
});
test('View Providers preserves the selected service ID', () => {
  const h = harness({ service: { name: 'Existing service' }, providers: [] }); const tree = h.render(h.load('app/customer/service.tsx').default);
  find(tree, 'children', 'View Providers').props.onPress(); assert.equal(h.navigation[0][1].params.serviceId, 'selected-service'); assert.equal(h.navigation[0][1].pathname, '/customer/providers');
});
test('provider card preserves provider and service selection', () => {
  const h = harness(null); const tree = h.render(h.load('components/customer/CustomerUI.tsx').ProviderCard, { provider: { _id: 'selected-provider', user: { fullName: 'Test' }, location: {}, services: [] }, serviceId: 'selected-service' });
  tree.props.onPress(); assert.equal(h.navigation[0][1].params.providerId, 'selected-provider'); assert.equal(h.navigation[0][1].params.serviceId, 'selected-service');
});
test('Book This Provider preserves both IDs', () => {
  const h = harness({ user: { fullName: 'Test' }, services: [], location: {} }); const tree = h.render(h.load('app/customer/provider.tsx').default);
  find(tree, 'children', 'Book This Provider').props.onPress(); assert.equal(h.navigation[0][1].pathname, '/customer/book'); assert.equal(h.navigation[0][1].params.serviceId, 'selected-service'); assert.equal(h.navigation[0][1].params.providerId, 'selected-provider');
});
test('customer route guard blocks anonymous and other roles', () => {
  for (const user of [null, { role: 'admin' }, { role: 'provider' }]) {
    const h = harness(null, { auth: { user } }); const tree = h.render(h.load('components/customer/CustomerUI.tsx').CustomerGuard, { children: 'protected' }); assert.equal(tree.type, 'Redirect'); assert.equal(tree.props.href, user ? '/' : '/auth/login');
  }
});
const data = { provider: { user: { fullName: 'Test' }, priceFrom: 1000 }, service: { name: 'Service' }, addresses: [{ _id: 'owned-address', label: 'Home', line1: 'Street', isDefault: true }] };
function fillBooking(h, screen) {
  find(h.render(screen), 'accessibilityLabel', 'Appointment date YYYY-MM-DD').props.onChangeText('2099-10-05');
  find(h.render(screen), 'accessibilityLabel', 'Appointment time HH:mm').props.onChangeText('10:00');
}
test('booking submits both IDs and saved address, then opens existing payment screen', async () => {
  const h = harness(data); const screen = h.load('app/customer/book.tsx').default; fillBooking(h, screen);
  find(h.render(screen), 'children', 'Request Booking').props.onPress(); await flush(); assert.equal(h.calls[0].serviceId, 'selected-service'); assert.equal(h.calls[0].providerId, 'selected-provider'); assert.equal(h.calls[0].addressId, 'owned-address'); assert.equal(h.calls[0].totalPrice, undefined); assert.equal(h.navigation[0][1].pathname, '/payment/details'); assert.equal(h.navigation[0][1].params.bookingId, 'created-booking');
});
test('invalid appointment never creates a booking', async () => {
  const h = harness(data); const screen = h.load('app/customer/book.tsx').default; find(h.render(screen), 'children', 'Request Booking').props.onPress(); await flush(); assert.equal(h.calls.length, 0); assert.equal(h.navigation.length, 0);
});
test('duplicate taps cannot create multiple bookings', async () => {
  let release; const h = harness(data, { requestBooking: () => new Promise(resolve => { release = resolve; }) }); const screen = h.load('app/customer/book.tsx').default; fillBooking(h, screen);
  const button = find(h.render(screen), 'children', 'Request Booking'); button.props.onPress(); button.props.onPress(); assert.equal(h.calls.length, 1); release({ _id: 'created-booking' }); await flush(); assert.equal(h.navigation.length, 1);
});
