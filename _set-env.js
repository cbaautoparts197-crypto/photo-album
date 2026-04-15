const { spawn } = require('child_process');

const envVars = {
  'TURSO_DATABASE_URL': 'libsql://rbs-photo-album-cbaautoparts197-crypto.aws-ap-south-1.turso.io',
  'TURSO_AUTH_TOKEN': 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc3NTkxMDEsImlhdCI6MTc3NjIyMzEwMSwiaWQiOiIwMTlkOGYyNS0yYTAxLTdiYzUtODFhMy03ZThlN2JkZGQzMDMiLCJyaWQiOiJiNGZjZGUyZC0yZGI0LTRlYTMtYWFmNi0wNTNmZTEyZmU1N2YifQ.i_gjqk00vTqLC-Efl-9dr2t1lXl34Jss5lYvVLN0iangofPSsLGYjG0yq1XjU6A9f2HZfjGpMZeqPQdepBsmBw'
};

async function setEnv(key, value) {
  const add = spawn('vercel', ['env', 'add', key, 'production'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
  });
  let out = '', err = '';
  add.stdout.on('data', d => out += d.toString());
  add.stderr.on('data', d => err += d.toString());
  
  // Write value without trailing newline
  add.stdin.write(value);
  add.stdin.end();
  
  return new Promise((resolve) => {
    add.on('close', code => {
      console.log(`${key}: exit ${code}`);
      if (out) console.log(out.trim());
      resolve();
    });
  });
}

(async () => {
  for (const [key, value] of Object.entries(envVars)) {
    await setEnv(key, value);
  }
  console.log('Done!');
})();
