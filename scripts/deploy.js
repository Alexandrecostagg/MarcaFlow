// scripts/deploy.js — Script de deploy automatizado

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CONFIG = {
  cloudflare: {
    projectName: 'marcaflow',
    directory: 'public/'
  },
  firebase: {
    projectId: 'marcaflow-inpi',
    channelId: 'live'
  }
};

function log(message) {
  console.log(`\n[DEPLOY] ${message}`);
}

function runCommand(command, description) {
  log(description);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✓ ${description} completed`);
  } catch (error) {
    console.error(`✗ ${description} failed: ${error.message}`);
    process.exit(1);
  }
}

function checkEnvironment() {
  log('Checking environment...');
  
  const required = ['NODE_ENV', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'];
  for (const env of required) {
    if (!process.env[env]) {
      console.error(`✗ Missing environment variable: ${env}`);
      process.exit(1);
    }
  }
  
  console.log('✓ Environment checks passed\n');
}

function deployCloudflare() {
  log('Deploying to Cloudflare Pages...');
  
  const command = `wrangler pages deploy ${CONFIG.cloudflare.directory} --project-name ${CONFIG.cloudflare.projectName} --branch main`;
  runCommand(command, 'Cloudflare Pages deploy');
}

function deployFirebase() {
  log('Deploying Firebase rules...');
  
  const command = 'firebase deploy --only firestore:rules';
  runCommand(command, 'Firebase rules deploy');
}

function verifyDeploy() {
  log('Verifying deployment...');
  
  const url = 'https://marcaflow.pages.dev';
  try {
    execSync(`curl -s -o /dev/null -w "%{http_code}" ${url}`, { stdio: 'inherit' });
    console.log('✓ Deployment verified\n');
  } catch (error) {
    console.error('✗ Deployment verification failed');
    process.exit(1);
  }
}

async function main() {
  log('Starting MarcaFlow deployment...');
  
  checkEnvironment();
  deployCloudflare();
  deployFirebase();
  verifyDeploy();
  
  log('Deployment complete! 🎉');
  console.log(`\n🌐 URL: https://marcaflow.pages.dev\n`);
}

main();
