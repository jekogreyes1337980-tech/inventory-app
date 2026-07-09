const fs = require('fs');
const path = require('path');
const https = require('https');

// Helper to fetch JSON from URL
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'NodeJS-Security-Scanner' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            resolve({ error: `HTTP ${res.statusCode}: ${data.trim()}` });
          }
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runScan() {
  const rootDir = path.join(__dirname, '..');
  const serverPkgPath = path.join(rootDir, 'package.json');
  const clientPkgPath = path.join(rootDir, 'client', 'package.json');

  const dependencies = new Set();

  // Load backend dependencies
  if (fs.existsSync(serverPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(serverPkgPath, 'utf8'));
    if (pkg.dependencies) {
      Object.keys(pkg.dependencies).forEach(dep => dependencies.add(dep));
    }
  }

  // Load frontend dependencies
  if (fs.existsSync(clientPkgPath)) {
    const pkg = JSON.parse(fs.readFileSync(clientPkgPath, 'utf8'));
    if (pkg.dependencies) {
      Object.keys(pkg.dependencies).forEach(dep => dependencies.add(dep));
    }
    if (pkg.devDependencies) {
      Object.keys(pkg.devDependencies).forEach(dep => dependencies.add(dep));
    }
  }

  console.log(`Scanning ${dependencies.size} unique dependencies...`);

  let reportContent = `# Red Hat Security Scan Report\n\n`;
  reportContent += `Generated on: ${new Date().toISOString()}\n\n`;
  reportContent += `This report lists CVE information retrieved programmatically from the [Red Hat Security Data API](https://access.redhat.com/documentation/en-us/red_hat_security_data_api/).\n\n`;
  reportContent += `## Scan Summary\n\n`;

  const results = [];
  let totalCves = 0;

  for (const pkg of Array.from(dependencies).sort()) {
    console.log(`Querying API for package: ${pkg}...`);
    // Query both standard name and nodejs- prefix
    const queries = [pkg, `nodejs-${pkg}`];
    const pkgCves = [];

    for (const q of queries) {
      const url = `https://access.redhat.com/hydra/rest/securitydata/cve.json?package=${q}&isCompressed=false`;
      try {
        const data = await fetchJson(url);
        if (Array.isArray(data)) {
          data.forEach(item => {
            // Deduplicate CVEs
            if (!pkgCves.some(c => c.CVE === item.CVE)) {
              pkgCves.push(item);
            }
          });
        }
      } catch (err) {
        console.error(`Failed to scan query: ${q}`, err.message);
      }
    }

    // Filter CVEs to reduce false positives due to substring matches.
    // Red Hat matches package names loosely, e.g. "cors" returns "rack-cors" or "jackson-databind".
    // We check if the package name or its prefix matches the CVE's description/package state.
    const filteredCves = pkgCves.filter(item => {
      const desc = (item.bugzilla_description || '').toLowerCase();
      // If it contains prefix matching the package, keep it
      const exactPrefix = `${pkg}:`;
      const prefixNode = `nodejs-${pkg}:`;
      if (desc.includes(exactPrefix) || desc.includes(prefixNode) || desc.includes(pkg.toLowerCase())) {
        return true;
      }
      // If it's a very general term, keep it but we might get some noise
      return false;
    });

    results.push({
      package: pkg,
      cves: filteredCves,
      rawCount: pkgCves.length
    });

    totalCves += filteredCves.length;
  }

  // Generate markdown tables
  reportContent += `- **Total dependencies scanned:** ${dependencies.size}\n`;
  reportContent += `- **Packages with identified vulnerabilities:** ${results.filter(r => r.cves.length > 0).length}\n`;
  reportContent += `- **Total verified CVEs found:** ${totalCves}\n\n`;

  reportContent += `## Vulnerability Details\n\n`;

  for (const res of results) {
    if (res.cves.length === 0) {
      reportContent += `### ✅ ${res.package}\n`;
      reportContent += `No matching vulnerabilities found in the Red Hat Database.\n\n`;
    } else {
      reportContent += `### ⚠️ ${res.package} (${res.cves.length} CVEs)\n\n`;
      reportContent += `| CVE ID | Severity | CVSS v3 | Description |\n`;
      reportContent += `| :--- | :--- | :--- | :--- |\n`;
      for (const cve of res.cves) {
        const severity = cve.severity || 'N/A';
        const score = cve.cvss3_score || 'N/A';
        const desc = cve.bugzilla_description || 'No description available.';
        const link = `[${cve.CVE}](https://access.redhat.com/security/cve/${cve.CVE})`;
        reportContent += `| ${link} | ${severity} | ${score} | ${desc} |\n`;
      }
      reportContent += `\n`;
    }
  }

  const reportPath = path.join(rootDir, 'security-report.md');
  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`Report generated successfully at ${reportPath}`);
}

runScan().catch(err => {
  console.error('Scan execution failed:', err);
  process.exit(1);
});
