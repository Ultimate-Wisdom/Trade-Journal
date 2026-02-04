import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in .env file');
  process.exit(1);
}

console.log('🔍 Checking Gemini API Key and available models...\n');
console.log(`API Key (first 10 chars): ${API_KEY.substring(0, 10)}...\n`);

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

try {
  console.log('📡 Making request to:', API_URL.replace(API_KEY, '***'));
  console.log('⏳ Please wait...\n');

  const response = await fetch(API_URL);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ API Request Failed');
    console.error('Status:', response.status, response.statusText);
    console.error('Error Details:', JSON.stringify(errorData, null, 2));
    process.exit(1);
  }

  const data = await response.json();

  if (!data.models || data.models.length === 0) {
    console.log('⚠️  No models found in response');
    console.log('Full Response:', JSON.stringify(data, null, 2));
    process.exit(0);
  }

  console.log('✅ API Key is valid!\n');
  console.log('📋 Available Models:');
  console.log('═'.repeat(60));

  // Group models by name (without version suffix)
  const modelGroups = {};
  data.models.forEach(model => {
    const baseName = model.name.split('/').pop();
    if (!modelGroups[baseName]) {
      modelGroups[baseName] = [];
    }
    modelGroups[baseName].push({
      name: model.name,
      displayName: model.displayName || 'N/A',
      supportedMethods: model.supportedGenerationMethods || [],
      description: model.description || 'No description'
    });
  });

  // Display models grouped by base name
  Object.keys(modelGroups).sort().forEach(baseName => {
    console.log(`\n📦 ${baseName}`);
    modelGroups[baseName].forEach(model => {
      console.log(`   Full Name: ${model.name}`);
      console.log(`   Display: ${model.displayName}`);
      const methods = model.supportedGenerationMethods && model.supportedGenerationMethods.length > 0
        ? model.supportedGenerationMethods.join(', ')
        : 'N/A';
      console.log(`   Methods: ${methods}`);
      if (model.description && model.description !== 'No description') {
        console.log(`   Description: ${model.description.substring(0, 80)}...`);
      }
      console.log('');
    });
  });

  console.log('═'.repeat(60));
  console.log(`\n✅ Total models found: ${data.models.length}`);
  console.log('\n💡 Recommended models for generateContent:');
  
  const generateContentModels = data.models.filter(m => 
    m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')
  );
  
  if (generateContentModels.length > 0) {
    generateContentModels.forEach(model => {
      const modelId = model.name.split('/').pop();
      console.log(`   - ${modelId}`);
    });
  } else {
    console.log('   ⚠️  No models found with generateContent support');
  }

} catch (error) {
  console.error('❌ Network/Request Error:');
  console.error(error.message);
  if (error.stack) {
    console.error('\nStack:', error.stack);
  }
  process.exit(1);
}
