const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '..', '.env');
const BACKUP_PATH = path.join(__dirname, '..', 'supabase-credentials.json');

function checkAndFixEnv() {
  let envContent = '';
  try {
    envContent = fs.readFileSync(ENV_PATH, 'utf8');
  } catch (e) {
    envContent = '';
  }

  const backup = JSON.parse(fs.readFileSync(BACKUP_PATH, 'utf8'));

  const expectedLines = [
    `VITE_SUPABASE_URL=${backup.VITE_SUPABASE_URL}`,
    `VITE_SUPABASE_ANON_KEY=${backup.VITE_SUPABASE_ANON_KEY}`,
  ];
  const lines = envContent.split(/\r?\n/).filter(line =>
    !line.startsWith('VITE_SUPABASE_URL=') &&
    !line.startsWith('VITE_SUPABASE_ANON_KEY=')
  );
  const normalizedContent = [...lines, ...expectedLines].join('\n');

  if (envContent !== `${normalizedContent}\n`) {
    console.log('⚠️  .env detectado con credenciales incorrectas. Restaurando...');
    fs.writeFileSync(ENV_PATH, `${normalizedContent}\n`, 'utf8');
    console.log('✅ .env restaurado con credenciales correctas');
  } else {
    console.log('✅ .env verificado - credenciales correctas');
  }
}

checkAndFixEnv();
