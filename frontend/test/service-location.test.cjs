/* global __dirname */
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
// Execute actual screen handlers and AuthContext with controlled hooks, router,
// API and storage. No real credentials or database writes are used.
function harness(authOverrides = {}, clientOverrides = {}) {
  let cells = [], cursor = 0, effects = [];
  const navigation = [], calls = [];
  const auth = { user: null, loading: false, login: async (...args) => calls.push(["login", ...args]), register: async (...args) => calls.push(["register", ...args]), ...authOverrides };
  const react = {
    useState(initial) { const index = cursor++; if (!(index in cells)) cells[index] = typeof initial === "function" ? initial() : initial; return [cells[index], (value) => { cells[index] = typeof value === "function" ? value(cells[index]) : value; }]; },
    useRef(initial) { const index = cursor++; if (!(index in cells)) cells[index] = { current: initial }; return cells[index]; },
    useCallback: (fn) => fn,
    useEffect(fn) { const index = cursor++; if (!(index in cells)) { cells[index] = true; effects.push(fn); } },
    createContext: () => ({ Provider: "Provider" }), useContext: () => auth,
  };
  const router = { push: (href) => navigation.push(["push", href]), replace: (href) => navigation.push(["replace", href]), back: () => navigation.push(["back"]), canGoBack: () => false };
  const native = new Proxy({ StyleSheet: { create: (s) => s }, Platform: { OS: "web" } }, { get: (obj, key) => obj[key] || key });
  const cache = {};
  const client = { api: { post: async () => { throw new Error("Unexpected API call"); }, get: async () => { throw new Error("Unexpected API call"); } }, saveToken: async () => {}, clearToken: async () => {}, getStoredToken: async () => null, ...clientOverrides };
  function load(relative) {
    const filename = path.resolve(__dirname, "../src", relative);
    if (cache[filename]) return cache[filename];
    const output = ts.transpileModule(fs.readFileSync(filename,"utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    const exports = {}; cache[filename] = exports;
    const requireMock = (name) => {
      if (name === "react") return react;
      if (name === "react/jsx-runtime") return { jsx: (type,props) => ({type,props}), jsxs: (type,props) => ({type,props}) };
      if (name === "react-native") return native;
      if (name === "expo-router") return { router, Redirect: "Redirect", useFocusEffect: (fn) => react.useEffect(fn) };
      if (name === "react-native-safe-area-context") return { SafeAreaView: "SafeAreaView" };
      if (name === "@/context/AuthContext") return { useAuth: () => auth };
      if (name === "@/context/AccountThemeContext") return { useAccountStyles: () => (s) => s };
      if (name === "@/validation/service-location") return load("validation/service-location.ts");
      if (name === "@/api/service-location") return clientOverrides.locationApi;
      if (name === "@/utils/current-service-location") return { currentServiceLocation: clientOverrides.locate };
      if (name === "expo-location") return clientOverrides.expoLocation;
      if (name === "@/api/client") return client;
      if (name === "axios") return { isAxiosError: (e) => !!e.isAxiosError };
      if (name === "@/validation/auth") return load("validation/auth.ts");
      if (name === "@/api/auth-error") return load("api/auth-error.ts");
      return new Proxy({ __esModule: true, default: name, addressStyles: {} }, { get: (obj,key) => obj[key] || key });
    };
    vm.runInNewContext(output, { exports, require: requireMock, console, AbortController, Error, navigator: clientOverrides.navigator, setTimeout, clearTimeout }); return exports;
  }
  const render = (component, props = {}) => { cursor = 0; const tree = component(props); for (const effect of effects.splice(0)) effect(); return tree; };
  return { load, render, navigation, calls, auth, router, platform: native.Platform };
}
function all(tree) { if (!tree || typeof tree !== "object") return []; if (Array.isArray(tree)) return tree.flatMap(all); return [tree, ...all(tree.props?.children)]; }
const find = (tree, key, value) => { const item = all(tree).find((node) => node.props?.[key] === value); assert.ok(item, `${key}=${value}`); return item; };
const flush = () => new Promise((resolve) => setImmediate(resolve));

const customer={id:"test-customer",role:"customer"};
function screenHarness(overrides={}) {
 const saved=[];
 const locationApi={getServiceLocation:async()=>null,saveServiceLocation:async(draft)=>{saved.push(draft);return draft;},serviceLocationError:()=>"Unable to save. Please try again.",...overrides};
 const h=harness({user:customer},{locationApi,locate:overrides.locate});
 return {...h,saved,screen:h.load("app/set-service-location.tsx").default};
}
async function ready(h) { h.render(h.screen);await flush();return h.render(h.screen); }
test("valid manual location saves and navigates Home",async()=>{
 const h=screenHarness();let tree=await ready(h);find(tree,"label","Area or city").props.onChangeText("Malabe, Sri Lanka");tree=h.render(h.screen);find(tree,"title","Confirm location").props.onPress();await flush();assert.equal(h.saved[0].areaCity,"Malabe, Sri Lanka");assert.deepEqual(h.navigation,[["replace","/"]]);
});
test("empty input produces inline error and no save",async()=>{const h=screenHarness();const tree=await ready(h);find(tree,"title","Confirm location").props.onPress();assert.ok(find(h.render(h.screen),"label","Area or city").props.error);assert.equal(h.saved.length,0);});
for(const reason of ["Location permission was not granted. You can enter your area manually.","Location lookup failed."]) test(`${reason} preserves manual entry`,async()=>{
 const h=screenHarness({locate:async()=>{throw new Error(reason);}});let tree=await ready(h);find(tree,"label","Area or city").props.onChangeText("Malabe");find(h.render(h.screen),"title","Use current location").props.onPress();await flush();tree=h.render(h.screen);assert.equal(find(tree,"label","Area or city").props.value,"Malabe");assert.equal(find(tree,"label","Area or city").props.editable,true);assert.ok(all(tree).some(n=>n.props?.children===reason));
});
test("granted current lookup populates area and manual edits retain coordinates",async()=>{
 const h=screenHarness({locate:async()=>({location:{areaCity:"Malabe, Sri Lanka",source:"current",latitude:6.9,longitude:79.9},note:"Found"})});let tree=await ready(h);find(tree,"title","Use current location").props.onPress();await flush();tree=h.render(h.screen);assert.equal(find(tree,"label","Area or city").props.value,"Malabe, Sri Lanka");find(tree,"label","Area or city").props.onChangeText("Colombo");find(h.render(h.screen),"title","Confirm location").props.onPress();await flush();assert.equal(h.saved[0].source,"current");assert.equal(h.saved[0].latitude,6.9);assert.equal(h.saved[0].longitude,79.9);assert.equal(h.saved[0].areaCity,"Colombo");
});
for(const [role,location,redirect] of [["customer",null,true],["customer",{areaCity:"Malabe",source:"manual"},false],["provider",null,false],["admin",null,false]]) test(`routing ${role} location=${!!location}`,async()=>{
 let reads=0; const h=harness({user:{id:"test",role}},{locationApi:{getServiceLocation:async()=>{reads++;return location;},serviceLocationError:()=>"Error"}});const Gate=h.load("components/location/ServiceLocationGate.tsx").ServiceLocationGate;h.render(Gate,{children:"Home"});await flush();const tree=h.render(Gate,{children:"Home"});if(redirect) assert.equal(tree.props.href,"/set-service-location");else assert.equal(tree,"Home");if(role!=="customer")assert.equal(reads,0);
});
test("existing service location prefills after refresh",async()=>{const h=screenHarness({getServiceLocation:async()=>({areaCity:"Saved area",source:"manual"})});assert.equal(find(await ready(h),"label","Area or city").props.value,"Saved area");});
test("native foreground permission and reverse geocoding are used",async()=>{
 let permission=0;const h=harness({}, {expoLocation:{Accuracy:{Balanced:3},requestForegroundPermissionsAsync:async()=>{permission++;return {granted:true};},getCurrentPositionAsync:async()=>({coords:{latitude:6.9,longitude:79.9}}),reverseGeocodeAsync:async()=>[{city:"Malabe",country:"Sri Lanka"}]}});h.platform.OS="android";const result=await h.load("utils/current-service-location.ts").currentServiceLocation();assert.equal(result.location.areaCity,"Malabe, Sri Lanka");assert.equal(permission,1);
});
test("browser geolocation permission and coordinates fallback",async()=>{
 const h=harness({}, {expoLocation:{},navigator:{geolocation:{getCurrentPosition:(resolve)=>resolve({coords:{latitude:6.9,longitude:79.9}})}}});const result=await h.load("utils/current-service-location.ts").currentServiceLocation();assert.equal(result.location.source,"current");assert.equal(result.location.areaCity,"");assert.equal(result.note,"Current location detected. Please enter your area or city to continue.");
});
test("browser permission denial gives manual fallback message",async()=>{
 const h=harness({}, {expoLocation:{},navigator:{geolocation:{getCurrentPosition:(_,reject)=>reject({code:1})}}});await assert.rejects(h.load("utils/current-service-location.ts").currentServiceLocation(),/permission was not granted/);
});

test("failed save stays on U11 and retains manual input",async()=>{
 const h=screenHarness({saveServiceLocation:async()=>{throw new Error("offline");}});let tree=await ready(h);find(tree,"label","Area or city").props.onChangeText("Malabe");find(h.render(h.screen),"title","Confirm location").props.onPress();await flush();tree=h.render(h.screen);assert.equal(find(tree,"label","Area or city").props.value,"Malabe");assert.equal(h.navigation.length,0);assert.ok(all(tree).some(n=>n.props?.children==="Unable to save. Please try again."));
});
test("duplicate GPS requests are blocked",async()=>{
 let count=0,release;const h=screenHarness({locate:()=>{count++;return new Promise(resolve=>release=resolve);}});let tree=await ready(h);const button=find(tree,"title","Use current location");button.props.onPress();button.props.onPress();assert.equal(count,1);release({location:{areaCity:"Malabe",source:"current",latitude:6.9,longitude:79.9},note:"Found"});await flush();
});
test("duplicate saves are blocked",async()=>{
 let count=0,release;const h=screenHarness({saveServiceLocation:()=>{count++;return new Promise(resolve=>release=resolve);}});let tree=await ready(h);find(tree,"label","Area or city").props.onChangeText("Malabe");tree=h.render(h.screen);const button=find(tree,"title","Confirm location");button.props.onPress();button.props.onPress();assert.equal(count,1);release({areaCity:"Malabe",source:"manual"});await flush();
});
test("native reverse geocode failure keeps usable coordinates",async()=>{
 const h=harness({}, {expoLocation:{Accuracy:{Balanced:3},requestForegroundPermissionsAsync:async()=>({granted:true}),getCurrentPositionAsync:async()=>({coords:{latitude:6.9,longitude:79.9}}),reverseGeocodeAsync:async()=>{throw new Error("unavailable");}}});h.platform.OS="ios";const result=await h.load("utils/current-service-location.ts").currentServiceLocation();assert.equal(result.location.latitude,6.9);assert.equal(result.location.areaCity,"");assert.equal(result.note,"Current location detected. Please enter your area or city to continue.");
});

test("Web GPS fallback requires a readable area and saves it with detected coordinates",async()=>{
 const h=screenHarness({locate:async()=>({location:{areaCity:"",source:"current",latitude:6.9201,longitude:79.8587},note:"Current location detected. Please enter your area or city to continue."})});
 let tree=await ready(h);find(tree,"title","Use current location").props.onPress();await flush();tree=h.render(h.screen);
 assert.equal(find(tree,"label","Area or city").props.value,"");assert.equal(find(tree,"label","Area or city").props.editable,true);
 find(tree,"title","Confirm location").props.onPress();assert.equal(h.saved.length,0);assert.ok(find(h.render(h.screen),"label","Area or city").props.error);
 find(h.render(h.screen),"label","Area or city").props.onChangeText("Malabe, Sri Lanka");find(h.render(h.screen),"title","Confirm location").props.onPress();await flush();
 assert.equal(h.saved[0].areaCity,"Malabe, Sri Lanka");assert.equal(h.saved[0].latitude,6.9201);assert.equal(h.saved[0].longitude,79.8587);assert.equal(h.saved[0].source,"current");
});
