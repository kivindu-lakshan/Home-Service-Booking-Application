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
      if (name === "expo-router") return { router, Redirect: "Redirect", useLocalSearchParams: () => ({}) };
      if (name === "react-native-safe-area-context") return { SafeAreaView: "SafeAreaView" };
      if (name === "@/context/AuthContext") return { useAuth: () => auth };
      if (name === "@/context/AccountThemeContext") return { useAccountStyles: () => (s) => s };
      if (name === "@/api/client") return client;
      if (name === "axios") return { isAxiosError: (e) => !!e.isAxiosError };
      if (name === "@/validation/auth") return load("validation/auth.ts");
      if (name === "@/api/auth-error") return load("api/auth-error.ts");
      return new Proxy({ __esModule: true, default: name, addressStyles: {} }, { get: (obj,key) => obj[key] || key });
    };
    vm.runInNewContext(output, { exports, require: requireMock, console }); return exports;
  }
  const render = (component, props = {}) => { cursor = 0; const tree = component(props); for (const effect of effects.splice(0)) effect(); return tree; };
  return { load, render, navigation, calls, auth, router };
}
function all(tree) { if (!tree || typeof tree !== "object") return []; if (Array.isArray(tree)) return tree.flatMap(all); return [tree, ...all(tree.props?.children)]; }
const find = (tree, key, value) => { const item = all(tree).find((node) => node.props?.[key] === value); assert.ok(item, `${key}=${value}`); return item; };
const flush = () => new Promise((resolve) => setImmediate(resolve));
for (const [file, title, destination] of [
  ["onboarding/landing", "Get started", "/onboarding/welcome"],
  ["onboarding/landing", "Already a member? Sign in", "/auth/login"],
  ["onboarding/welcome", "Let's get started", "/onboarding/account-type"],
  ["onboarding/welcome", "Skip introduction", "/onboarding/account-type"],
  ["onboarding/account-type", "Find a service", "/auth/register"],
  ["onboarding/account-type", "Sign in", "/auth/login"],
]) test(`${file}: ${title}`, () => {
  const h = harness(); const screen = h.load(`app/${file}.tsx`).default;
  find(h.render(screen), "title", title).props.onPress(); assert.equal(h.navigation[0][1], destination);
});
test("provider option enters provider registration", () => { const h=harness(); const tree=h.render(h.load("app/onboarding/account-type.tsx").default); const card=find(tree,"title","Offer a service"); card.props.onPress(); assert.equal(h.navigation[0][1].params.role,"provider"); });
function fill(h, screen, values) { for (const [label,value] of Object.entries(values)) find(h.render(screen),"label",label).props.onChangeText(value); }
test("valid login calls existing auth and preserves destination", async () => {
 const h=harness(); const screen=h.load("app/auth/login.tsx").default; fill(h,screen,{"Email address":" customer@example.invalid ",Password:"existing-password"});
 find(h.render(screen),"title","Sign In").props.onPress(); await flush(); assert.deepEqual(h.calls,[["login","customer@example.invalid","existing-password"]]); assert.deepEqual(h.navigation,[["replace","/"]]);
});
test("invalid credentials display API error and preserve input", async () => {
 const h=harness({login:async()=>{throw {isAxiosError:true,response:{data:{message:"Invalid email or password."}}};}}); const screen=h.load("app/auth/login.tsx").default;
 fill(h,screen,{"Email address":"customer@example.invalid",Password:"wrong"}); find(h.render(screen),"title","Sign In").props.onPress(); await flush();
 const tree=h.render(screen); assert.ok(all(tree).some(n=>n.props?.children==="Invalid email or password.")); assert.equal(find(tree,"label","Password").props.value,"wrong"); assert.equal(h.navigation.length,0);
});
test("duplicate login submissions are blocked", async () => {
 let release,count=0; const h=harness({login:()=>{count++;return new Promise(r=>release=r);}}); const screen=h.load("app/auth/login.tsx").default;
 fill(h,screen,{"Email address":"customer@example.invalid",Password:"password"}); const button=find(h.render(screen),"title","Sign In"); button.props.onPress(); button.props.onPress(); assert.equal(count,1); release(); await flush();
});
const registration={"Full name":"Test Customer","Email address":"new@example.invalid","Phone number":"0771234567",Password:"Example123","Confirm password":"Example123"};
test("valid customer registration preserves request fields and destination", async () => {
 const h=harness(); const screen=h.load("app/auth/register.tsx").default; fill(h,screen,registration); find(h.render(screen),"title","Agree & create account").props.onPress(); await flush();
 assert.deepEqual(h.calls,[["register","Test Customer","new@example.invalid","0771234567","Example123","customer"]]); assert.deepEqual(h.navigation,[["replace","/"]]);
});
test("invalid registration stays on form with inline errors", async () => {
 const h=harness(); const screen=h.load("app/auth/register.tsx").default; fill(h,screen,{...registration,"Email address":"bad",Password:"short","Confirm password":"different"}); find(h.render(screen),"title","Agree & create account").props.onPress(); await flush();
 const tree=h.render(screen); for(const label of ["Email address","Password","Confirm password"]) assert.ok(find(tree,"label",label).props.error); assert.equal(h.calls.length,0);
});
test("admin uses ordinary login without requesting a role", async () => {
 const h=harness(); const screen=h.load("app/auth/login.tsx").default; fill(h,screen,{"Email address":"admin@example.invalid",Password:"existing-password"}); find(h.render(screen),"title","Sign In").props.onPress(); await flush(); assert.deepEqual(h.calls,[["login","admin@example.invalid","existing-password"]]);
});
test("back buttons use browser/app history and safe direct-link fallback", () => {
 const h=harness(); const {AuthPage}=h.load("components/auth/AuthUI.tsx");
 h.render(AuthPage,{title:"Create",subtitle:"",back:"/onboarding/account-type"}).props.onBack(); assert.deepEqual(h.navigation.pop(),["replace","/onboarding/account-type"]);
 h.router.canGoBack=()=>true; h.render(AuthPage,{title:"Create",subtitle:"",back:"/onboarding/account-type"}).props.onBack(); assert.deepEqual(h.navigation.pop(),["back"]);
});
test("password visibility toggles without changing entered password", () => {
 const h=harness(); const {AuthField}=h.load("components/auth/AuthUI.tsx"); const props={label:"Password",password:true,value:"hidden-value"};
 let tree=h.render(AuthField,props); assert.equal(find(tree,"accessibilityLabel","Password").props.secureTextEntry,true);
 find(tree,"accessibilityLabel","Show password").props.onPress(); tree=h.render(AuthField,props); assert.equal(find(tree,"accessibilityLabel","Password").props.secureTextEntry,false); assert.equal(find(tree,"accessibilityLabel","Password").props.value,"hidden-value");
});
test("refresh restores session using existing AuthContext and /auth/me", async () => {
 const user={id:"test-user",fullName:"Test",role:"customer"}; const requests=[];
 const h=harness({}, {getStoredToken:async()=>"test-only-token",api:{get:async(url)=>{requests.push(url);return {data:{data:user}};}}});
 const {AuthProvider}=h.load("context/AuthContext.tsx"); h.render(AuthProvider); await flush(); const tree=h.render(AuthProvider);
 assert.equal(tree.props.value.loading,false); assert.equal(tree.props.value.user.id,user.id); assert.deepEqual(requests,["/auth/me"]);
});
test("existing AuthContext stores successful login token and user", async () => {
 const stored=[]; const user={id:"test-user",role:"customer"};
 const h=harness({}, {saveToken:async(token)=>stored.push(token),api:{post:async(url,body)=>{assert.equal(url,"/auth/login");assert.deepEqual(Object.keys(body).sort(),["email","password"]);assert.equal(body.email,"customer@example.invalid");return {data:{data:{user,token:"test-only-token"}}};}}});
 const {AuthProvider}=h.load("context/AuthContext.tsx"); let tree=h.render(AuthProvider); await flush(); await tree.props.value.login("customer@example.invalid","example"); tree=h.render(AuthProvider);
 assert.deepEqual(stored,["test-only-token"]); assert.equal(tree.props.value.user.role,"customer");
});
test("restored user bypasses onboarding", () => { const h=harness({user:{id:"test-user"}}); const tree=h.render(h.load("app/onboarding/landing.tsx").default); assert.equal(tree.type,"Redirect"); assert.equal(tree.props.href,"/"); });

for (const [role, destination] of [["customer",null],["provider","/provider/dashboard"],["admin","/admin/home"]]) {
 test(`home routes ${role} to its role area`,()=>{const h=harness({user:{id:"test",role}});const tree=h.render(h.load("app/index.tsx").default); if(destination) assert.equal(tree.props.href,destination);else assert.equal(tree.type,"@/components/customer/CustomerHome");});
 test(`restart validates ${role} with /auth/me`,async()=>{const user={id:"test",role};const h=harness({}, {getStoredToken:async()=>"stored",api:{get:async()=>({data:{data:user}})}});const {AuthProvider}=h.load("context/AuthContext.tsx");h.render(AuthProvider);await flush();assert.equal(h.render(AuthProvider).props.value.user.role,role);});
}
test("provider registration submits provider role",async()=>{const h=harness();const screen=h.load("app/auth/register.tsx").default;fill(h,screen,registration);all(h.render(screen)).filter(n=>n.props?.accessibilityRole==="radio")[1].props.onPress();find(h.render(screen),"title","Agree & create account").props.onPress();await flush();assert.equal(h.calls[0][5],"provider");});
test("logout clears token and user",async()=>{let cleared=0;const h=harness({}, {clearToken:async()=>cleared++,api:{post:async()=>({data:{data:{user:{id:"test",role:"admin"},token:"test"}}})}});const {AuthProvider}=h.load("context/AuthContext.tsx");h.render(AuthProvider);await flush();await h.render(AuthProvider).props.value.login("test","test");await h.render(AuthProvider).props.value.logout();const state=h.render(AuthProvider).props.value;assert.equal(cleared,1);assert.equal(state.user,null);assert.equal(state.verificationToken,null);});
for(const role of ["admin","provider"]) test(`${role} guard rejects wrong role and signed out sessions`,()=>{const h=harness({user:{role:"customer"}});const {RoleGuard}=h.load("components/auth/RoleGuard.tsx");assert.equal(h.render(RoleGuard,{role}).props.href,"/");h.auth.user=null;assert.equal(h.render(RoleGuard,{role}).props.href,"/auth/login");});

test("login has one common Sign In action and no account role selector", () => {
 const h=harness();const tree=h.render(h.load("app/auth/login.tsx").default);
 assert.equal(all(tree).filter(n=>n.props?.title==="Sign In").length,1);
 assert.equal(all(tree).filter(n=>["radio","radiogroup"].includes(n.props?.accessibilityRole)).length,0);
 assert.ok(!JSON.stringify(tree).match(/Choose account type|Sign in as|Login As Admin/i));
 find(tree,"title","Create an account").props.onPress();assert.deepEqual(h.navigation,[["push","/auth/register"]]);
});
test("registration role selector follows required fields and offers only two roles",()=>{
 const h=harness();const tree=h.render(h.load("app/auth/register.tsx").default);const list=all(tree);
 const radios=list.filter(n=>n.props?.accessibilityRole==="radio");assert.equal(radios.length,2);
 const label=list.find(n=>n.props?.children==="Register as");assert.ok(label);
 assert.ok(list.indexOf(label)>list.indexOf(find(tree,"label","Confirm password")));
 assert.ok(!JSON.stringify(radios).includes("Admin"));
});
