# Red Hat Security Scan Report

Generated on: 2026-07-09T01:10:41.616Z

This report lists CVE information retrieved programmatically from the [Red Hat Security Data API](https://access.redhat.com/documentation/en-us/red_hat_security_data_api/).

## Scan Summary

- **Total dependencies scanned:** 11
- **Packages with identified vulnerabilities:** 5
- **Total verified CVEs found:** 104

## Vulnerability Details

### ✅ @vitejs/plugin-react
No matching vulnerabilities found in the Red Hat Database.

### ✅ bcryptjs
No matching vulnerabilities found in the Red Hat Database.

### ⚠️ cors (2 CVEs)

| CVE ID | Severity | CVSS v3 | Description |
| :--- | :--- | :--- | :--- |
| [CVE-2024-27456](https://access.redhat.com/security/cve/CVE-2024-27456) | moderate | 7.8 | rack-cors: Insecure File Permissions in rack-cors |
| [CVE-2020-25032](https://access.redhat.com/security/cve/CVE-2020-25032) | moderate | 7.5 | python-flask-cors: allows ../ directory traversal to access private resources |

### ⚠️ express (9 CVEs)

| CVE ID | Severity | CVSS v3 | Description |
| :--- | :--- | :--- | :--- |
| [CVE-2026-41852](https://access.redhat.com/security/cve/CVE-2026-41852) | low | 3.7 | spring-framework: org.springframework/spring-expression: Spring Framework: SpEL vulnerability allows unintended application logic invocation |
| [CVE-2024-9266](https://access.redhat.com/security/cve/CVE-2024-9266) | moderate | 6.1 | express: URL redirection vulnerability |
| [CVE-2024-43796](https://access.redhat.com/security/cve/CVE-2024-43796) | moderate | 5.0 | express: Improper Input Handling in Express Redirects |
| [CVE-2024-38808](https://access.redhat.com/security/cve/CVE-2024-38808) | moderate | 5.9 | spring-expression: Denial of service when processing a specially crafted Spring Expression Language expression |
| [CVE-2024-29041](https://access.redhat.com/security/cve/CVE-2024-29041) | important | 6.1 | express: cause malformed URLs to be evaluated |
| [CVE-2022-22950](https://access.redhat.com/security/cve/CVE-2022-22950) | moderate | 7.5 | spring-expression: Denial of service via specially crafted SpEL expression |
| [CVE-2016-1000023](https://access.redhat.com/security/cve/CVE-2016-1000023) | moderate | 5.3 | nodejs-minimatch: Regular expression denial-of-service |
| [CVE-2016-1000022](https://access.redhat.com/security/cve/CVE-2016-1000022) | moderate | N/A | nodejs-negotiator: Regular expression denial-of-service |
| [CVE-2014-6393](https://access.redhat.com/security/cve/CVE-2014-6393) | moderate | N/A | express: cross-site scripting via content-type header |

### ⚠️ react (18 CVEs)

| CVE ID | Severity | CVSS v3 | Description |
| :--- | :--- | :--- | :--- |
| [CVE-2026-53663](https://access.redhat.com/security/cve/CVE-2026-53663) | low | 3.1 | react-router: @remix-run/server-runtime: React Router: Insufficient CSRF protection allows integrity impact |
| [CVE-2026-41715](https://access.redhat.com/security/cve/CVE-2026-41715) | moderate | 6.5 | reactor-netty: Reactor Netty: Credential leakage via HTTP redirects from secure to insecure endpoints |
| [CVE-2026-42342](https://access.redhat.com/security/cve/CVE-2026-42342) | moderate | 6.5 | react-router: @remix-run/server-runtime: React Router / Remix: Denial of Service via unbounded path expansion in __manifest endpoint |
| [CVE-2026-40181](https://access.redhat.com/security/cve/CVE-2026-40181) | moderate | 5.4 | react-router: React Router: Open redirect vulnerability via specially crafted URLs |
| [CVE-2026-34077](https://access.redhat.com/security/cve/CVE-2026-34077) | moderate | 6.5 | react-router: React Router: Denial of Service via client-side Cross-Site Scripting in RSC redirect handling |
| [CVE-2026-33245](https://access.redhat.com/security/cve/CVE-2026-33245) | moderate | 4.2 | react-router: React Router: Cross-Site Scripting vulnerability via untrusted React Server Component redirects |
| [CVE-2026-33244](https://access.redhat.com/security/cve/CVE-2026-33244) | moderate | 5.4 | react-router: React Router: Cross-Site Scripting (XSS) via improper HTTP Location header neutralization |
| [CVE-2026-22029](https://access.redhat.com/security/cve/CVE-2026-22029) | important | 8.0 | @remix-run/router: react-router: React Router vulnerable to XSS via Open Redirects |
| [CVE-2025-61686](https://access.redhat.com/security/cve/CVE-2025-61686) | critical | 9.1 | react-router: React Router has Path Traversal in File Session Storage |
| [CVE-2025-68470](https://access.redhat.com/security/cve/CVE-2025-68470) | moderate | 6.5 | react-router: React Router unexpected external redirect |
| [CVE-2025-14969](https://access.redhat.com/security/cve/CVE-2025-14969) | moderate | 4.3 | hibernate-reactive-core: Hibernate Reactive: Denial of Service due to connection leak on HTTP client disconnect |
| [CVE-2025-22227](https://access.redhat.com/security/cve/CVE-2025-22227) | moderate | 6.1 | io.projectreactor.netty/reactor-netty: Reactor Netty Credential Leak via Redirects |
| [CVE-2024-1726](https://access.redhat.com/security/cve/CVE-2024-1726) | low | 5.3 | quarkus: security checks for some inherited endpoints performed after serialization in RESTEasy Reactive may trigger a denial of service |
| [CVE-2023-5675](https://access.redhat.com/security/cve/CVE-2023-5675) | moderate | 6.5 | quarkus: Authorization flaw in Quarkus RestEasy Reactive and Classic when "quarkus.security.jaxrs.deny-unannotated-endpoints" or "quarkus.security.jaxrs.default-roles-allowed" properties are used. |
| [CVE-2023-34062](https://access.redhat.com/security/cve/CVE-2023-34062) | important | 7.5 | reactor-netty-http: directory traversal vulnerability |
| [CVE-2022-31684](https://access.redhat.com/security/cve/CVE-2022-31684) | low | 4.3 | reactor-netty-http: Log request headers in some cases of invalid HTTP requests |
| [CVE-2021-24033](https://access.redhat.com/security/cve/CVE-2021-24033) | moderate | 5.6 | nodejs-react-dev-utils: function getProcessForPort concatenates input argument into a command string |
| [CVE-2020-5404](https://access.redhat.com/security/cve/CVE-2020-5404) | moderate | 5.9 | reactor-netty: specific redirect configuration allows for a credentials leak |

### ✅ react-dom
No matching vulnerabilities found in the Red Hat Database.

### ✅ react-router-dom
No matching vulnerabilities found in the Red Hat Database.

### ⚠️ sqlite (68 CVEs)

| CVE ID | Severity | CVSS v3 | Description |
| :--- | :--- | :--- | :--- |
| [CVE-2025-70873](https://access.redhat.com/security/cve/CVE-2025-70873) | low | 3.3 | sqlite: SQLite: Information Disclosure via Crafted ZIP File |
| [CVE-2025-7458](https://access.redhat.com/security/cve/CVE-2025-7458) | moderate | 6.1 | sqlite: SQLite integer overflow |
| [CVE-2025-6965](https://access.redhat.com/security/cve/CVE-2025-6965) | important | 7.7 | sqlite: Integer Truncation in SQLite |
| [CVE-2025-3277](https://access.redhat.com/security/cve/CVE-2025-3277) | important | 7.3 | SQLite: integer overflow in SQLite |
| [CVE-2025-29088](https://access.redhat.com/security/cve/CVE-2025-29088) | moderate | 5.5 | sqlite: Denial of Service in SQLite |
| [CVE-2025-29087](https://access.redhat.com/security/cve/CVE-2025-29087) | moderate | 5.5 | sqlite: Integer Overflow in SQLite concat_ws Function |
| [CVE-2023-7104](https://access.redhat.com/security/cve/CVE-2023-7104) | moderate | 7.3 | sqlite: heap-buffer-overflow at sessionfuzz |
| [CVE-2024-0232](https://access.redhat.com/security/cve/CVE-2024-0232) | low | 4.7 | sqlite: use-after-free bug in jsonParseAddNodeArray |
| [CVE-2023-36191](https://access.redhat.com/security/cve/CVE-2023-36191) | low | 5.5 | sqlite: CLI fault on missing -nonce |
| [CVE-2023-32697](https://access.redhat.com/security/cve/CVE-2023-32697) | important | 8.8 | sqlite-jdbc: Remote code execution when JDBC url is attacker controlled |
| [CVE-2021-31239](https://access.redhat.com/security/cve/CVE-2021-31239) | moderate | 7.5 | sqlite: denial of service via the appendvfs.c function |
| [CVE-2020-24736](https://access.redhat.com/security/cve/CVE-2020-24736) | moderate | 6.2 | sqlite: Crash due to misuse of window functions. |
| [CVE-2022-46908](https://access.redhat.com/security/cve/CVE-2022-46908) | moderate | 7.3 | sqlite: safe mode authorizer callback allows disallowed UDFs |
| [CVE-2022-35737](https://access.redhat.com/security/cve/CVE-2022-35737) | moderate | 5.9 | sqlite: an array-bounds overflow if billions of bytes are used in a string argument to a C API |
| [CVE-2022-21227](https://access.redhat.com/security/cve/CVE-2022-21227) | moderate | 7.5 | sqlite3: Denial of Service (DoS) in sqlite3 |
| [CVE-2021-45346](https://access.redhat.com/security/cve/CVE-2021-45346) | low | 4.3 | sqlite: crafted SQL query allows a malicious user to obtain sensitive information |
| [CVE-2021-20227](https://access.redhat.com/security/cve/CVE-2021-20227) | moderate | 6.1 | sqlite: potential use-after-free bug when processing  a subquery with both a correlated WHERE clause and a "HAVING 0" clause and where the parent query is an aggregate |
| [CVE-2020-15358](https://access.redhat.com/security/cve/CVE-2020-15358) | moderate | 5.5 | sqlite: heap-based buffer overflow in multiSelectOrderBy due to mishandling of query-flattener optimization in select.c |
| [CVE-2020-13871](https://access.redhat.com/security/cve/CVE-2020-13871) | moderate | 7.5 | sqlite: use-after-free in resetAccumulator in select.c |
| [CVE-2020-13434](https://access.redhat.com/security/cve/CVE-2020-13434) | moderate | 5.5 | sqlite: integer overflow in sqlite3_str_vappendf function in printf.c |
| [CVE-2020-13435](https://access.redhat.com/security/cve/CVE-2020-13435) | moderate | 5.5 | sqlite: NULL pointer dereference in sqlite3ExprCodeTarget() |
| [CVE-2020-13630](https://access.redhat.com/security/cve/CVE-2020-13630) | moderate | 7.0 | sqlite: Use-after-free in fts3EvalNextRow in ext/fts3/fts3.c |
| [CVE-2020-13631](https://access.redhat.com/security/cve/CVE-2020-13631) | moderate | 5.5 | sqlite: Virtual table can be renamed into the name of one of its shadow tables |
| [CVE-2020-13632](https://access.redhat.com/security/cve/CVE-2020-13632) | moderate | 5.5 | sqlite: NULL pointer dereference in ext/fts3/fts3_snippet.c via a crafted matchinfo() query |
| [CVE-2020-11655](https://access.redhat.com/security/cve/CVE-2020-11655) | moderate | 7.5 | sqlite: malformed window-function query leads to DoS |
| [CVE-2020-11656](https://access.redhat.com/security/cve/CVE-2020-11656) | moderate | 8.8 | sqlite: use-after-free in the ALTER TABLE implementation |
| [CVE-2020-35527](https://access.redhat.com/security/cve/CVE-2020-35527) | moderate | 8.1 | sqlite: Out of bounds access during table rename |
| [CVE-2020-9327](https://access.redhat.com/security/cve/CVE-2020-9327) | moderate | 6.5 | sqlite: NULL pointer dereference and segmentation fault because of generated column optimizations |
| [CVE-2020-35525](https://access.redhat.com/security/cve/CVE-2020-35525) | low | 7.5 | sqlite: Null pointer derreference in src/select.c |
| [CVE-2020-6405](https://access.redhat.com/security/cve/CVE-2020-6405) | moderate | 6.5 | sqlite: Out-of-bounds read in SELECT with ON/USING clause |
| [CVE-2019-19924](https://access.redhat.com/security/cve/CVE-2019-19924) | moderate | 5.3 | sqlite: incorrect sqlite3WindowRewrite() error handling leads to mishandling certain parser-tree rewriting |
| [CVE-2019-19923](https://access.redhat.com/security/cve/CVE-2019-19923) | moderate | 7.5 | sqlite: mishandling of certain uses of SELECT DISTINCT involving a LEFT JOIN in flattenSubquery in select.c leads to a NULL pointer dereference |
| [CVE-2019-19925](https://access.redhat.com/security/cve/CVE-2019-19925) | moderate | 7.5 | sqlite: zipfileUpdate in ext/misc/zipfile.c mishandles a NULL pathname during an update of a ZIP archive |
| [CVE-2019-20218](https://access.redhat.com/security/cve/CVE-2019-20218) | moderate | 7.5 | sqlite: selectExpander in select.c proceeds with WITH stack unwinding even after a parsing error |
| [CVE-2019-19959](https://access.redhat.com/security/cve/CVE-2019-19959) | moderate | 7.3 | sqlite: mishandles certain uses of INSERT INTO in situations involving embedded '\0' characters in filenames |
| [CVE-2019-19926](https://access.redhat.com/security/cve/CVE-2019-19926) | moderate | 7.5 | sqlite: error mishandling because of incomplete fix of CVE-2019-19880 |
| [CVE-2019-19880](https://access.redhat.com/security/cve/CVE-2019-19880) | moderate | 7.5 | sqlite: invalid pointer dereference in exprListAppendList in window.c |
| [CVE-2019-13734](https://access.redhat.com/security/cve/CVE-2019-13734) | important | 8.8 | sqlite: fts3: improve shadow table corruption detection |
| [CVE-2019-13750](https://access.redhat.com/security/cve/CVE-2019-13750) | moderate | 6.5 | sqlite: dropping of shadow tables not restricted in defensive mode |
| [CVE-2019-13751](https://access.redhat.com/security/cve/CVE-2019-13751) | moderate | 6.5 | sqlite: fts3: improve detection of corrupted records |
| [CVE-2019-13752](https://access.redhat.com/security/cve/CVE-2019-13752) | moderate | 6.5 | sqlite: fts3: improve shadow table corruption detection |
| [CVE-2019-13753](https://access.redhat.com/security/cve/CVE-2019-13753) | moderate | 6.5 | sqlite: fts3: incorrectly removed corruption check |
| [CVE-2019-19645](https://access.redhat.com/security/cve/CVE-2019-19645) | moderate | 5.5 | sqlite: infinite recursion via certain types of self-referential views in conjunction with ALTER TABLE statements |
| [CVE-2019-19603](https://access.redhat.com/security/cve/CVE-2019-19603) | moderate | 7.5 | sqlite: mishandling of certain SELECT statements with non-existent VIEW can lead to DoS |
| [CVE-2019-19646](https://access.redhat.com/security/cve/CVE-2019-19646) | moderate | 6.3 | sqlite: pragma.c mishandles NOT NULL in an integrity_check PRAGMA command in certain cases of generated columns |
| [CVE-2019-19317](https://access.redhat.com/security/cve/CVE-2019-19317) | moderate | 7.5 | sqlite: omits bits from the colUsed bitmask in the case of a generated column |
| [CVE-2019-19242](https://access.redhat.com/security/cve/CVE-2019-19242) | moderate | 5.9 | sqlite: SQL injection in sqlite3ExprCodeTarget in expr.c |
| [CVE-2019-19244](https://access.redhat.com/security/cve/CVE-2019-19244) | low | 7.5 | sqlite: allows a crash if a sub-select uses both DISTINCT and window functions and also has certain ORDER BY usage |
| [CVE-2019-16168](https://access.redhat.com/security/cve/CVE-2019-16168) | moderate | 6.5 | sqlite: Division by zero in whereLoopAddBtreeIndex in sqlite3.c |
| [CVE-2019-5018](https://access.redhat.com/security/cve/CVE-2019-5018) | moderate | 8.1 | sqlite: Use-after-free in window function leading to remote code execution |
| [CVE-2019-5827](https://access.redhat.com/security/cve/CVE-2019-5827) | important | 8.8 | sqlite: out-of-bounds access due to the use of 32-bit memory allocator interfaces |
| [CVE-2019-8457](https://access.redhat.com/security/cve/CVE-2019-8457) | moderate | 7.5 | sqlite: heap out-of-bound read in function rtreenode() |
| [CVE-2019-9937](https://access.redhat.com/security/cve/CVE-2019-9937) | low | 5.3 | sqlite: null-pointer dereference in function fts5ChunkIterate in sqlite3.c |
| [CVE-2019-9936](https://access.redhat.com/security/cve/CVE-2019-9936) | low | 3.3 | sqlite: heap-based buffer over-read in function fts5HashEntrySort in sqlite3.c |
| [CVE-2018-20346](https://access.redhat.com/security/cve/CVE-2018-20346) | important | 7.0 | sqlite: Multiple flaws in sqlite which can be triggered via corrupted internal databases (Magellan) |
| [CVE-2018-20505](https://access.redhat.com/security/cve/CVE-2018-20505) | important | 7.0 | sqlite: Multiple flaws in sqlite which can be triggered via corrupted internal databases (Magellan) |
| [CVE-2018-20506](https://access.redhat.com/security/cve/CVE-2018-20506) | important | 7.0 | sqlite: Multiple flaws in sqlite which can be triggered via corrupted internal databases (Magellan) |
| [CVE-2018-8740](https://access.redhat.com/security/cve/CVE-2018-8740) | low | 3.3 | sqlite: NULL pointer dereference with databases with schema corrupted with CREATE TABLE AS allows for denial of service |
| [CVE-2017-15286](https://access.redhat.com/security/cve/CVE-2017-15286) | low | 3.3 | sqlite: NULL pointer dereference in tableColumnList |
| [CVE-2017-13685](https://access.redhat.com/security/cve/CVE-2017-13685) | low | 3.3 | sqlite: Local DoS via dump_callback function |
| [CVE-2017-7000](https://access.redhat.com/security/cve/CVE-2017-7000) | moderate | 6.5 | chromium-browser: pointer disclosure in sqlite |
| [CVE-2017-10989](https://access.redhat.com/security/cve/CVE-2017-10989) | low | 3.6 | sqlite: Heap-buffer overflow in the getNodeSize function |
| [CVE-2016-6153](https://access.redhat.com/security/cve/CVE-2016-6153) | low | 2.2 | sqlite: Tempdir selection vulnerability |
| [CVE-2015-7036](https://access.redhat.com/security/cve/CVE-2015-7036) | moderate | N/A | sqlite: arbitrary code execution on databases with malformed schema |
| [CVE-2015-3414](https://access.redhat.com/security/cve/CVE-2015-3414) | moderate | N/A | sqlite: use of uninitialized memory when parsing collation sequences in src/where.c |
| [CVE-2015-3415](https://access.redhat.com/security/cve/CVE-2015-3415) | moderate | N/A | sqlite: invalid free() in src/vdbe.c |
| [CVE-2015-3416](https://access.redhat.com/security/cve/CVE-2015-3416) | moderate | N/A | sqlite: stack buffer overflow in src/printf.c |
| [CVE-2013-7443](https://access.redhat.com/security/cve/CVE-2013-7443) | low | N/A | sqlite: array overrun in the skip-scan optimization leading to memory corruption (DoS) |

### ✅ sqlite3
No matching vulnerabilities found in the Red Hat Database.

### ✅ sweetalert2
No matching vulnerabilities found in the Red Hat Database.

### ⚠️ vite (7 CVEs)

| CVE ID | Severity | CVSS v3 | Description |
| :--- | :--- | :--- | :--- |
| [CVE-2024-52011](https://access.redhat.com/security/cve/CVE-2024-52011) | important | 8.3 | launch-editor: vite: launch-editor: Arbitrary command execution via insufficient file argument sanitization |
| [CVE-2026-39365](https://access.redhat.com/security/cve/CVE-2026-39365) | moderate | 5.3 | vite: Vite: Information disclosure via path traversal in dev server's .map request handling |
| [CVE-2026-39364](https://access.redhat.com/security/cve/CVE-2026-39364) | important | 7.5 | vite: Vite: Information disclosure via query parameter manipulation on the development server |
| [CVE-2026-39363](https://access.redhat.com/security/cve/CVE-2026-39363) | important | 7.5 | Vite: Vite: Information disclosure via WebSocket connection bypasses access control |
| [CVE-2024-45812](https://access.redhat.com/security/cve/CVE-2024-45812) | moderate | 6.4 | vite: XSS via DOM Clobbering gadget found in vite bundled scripts |
| [CVE-2024-45811](https://access.redhat.com/security/cve/CVE-2024-45811) | moderate | 4.8 | vite: server.fs.deny is bypassed when using `?import&raw` |
| [CVE-2023-49293](https://access.redhat.com/security/cve/CVE-2023-49293) | moderate | 6.1 | vitejs: XSS vulnerability in `server.transformIndexHtml` via URL payload |

