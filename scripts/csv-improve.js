require('dotenv').config();
const fs = require('fs');
const axios = require('axios');

const API_URL = process.env.API_URL || 'https://api.kluster.ai/v1/chat/completions';
const AI_MODEL = process.env.AI_MODEL || 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8';
const fileName = process.argv[2];
const promptName = process.argv[3];

if (!fileName) {
  console.error('❌ Usage: node csv-improve.js <csv_file> [prompt_name]');
  console.error('');
  console.error('📝 If no prompt_name is provided, default prompt will be used');
  console.error('📝 Custom prompts must be defined in .env file with format: PROMPT_NAME=...');
  console.error('');
  console.error('💡 Usage examples:');
  console.error('   node csv-improve.js data.csv                # Uses default prompt');
  console.error('   node csv-improve.js data.csv TECHNICAL      # Uses PROMPT_TECHNICAL from .env');
  console.error('   node csv-improve.js data.csv CATEGORIZE     # Uses PROMPT_CATEGORIZE from .env');
  process.exit(1);
}

// 👉 Default prompt built into the script
const DEFAULT_PROMPT = `You will receive a CSV dataset below. For Description column, generate a concise description under 15 words based on the data from the description column. Return the full updated CSV, with updated description field with the new description. Don't change any other column. Only respond with CSV, no explanation or extra text.`;

// 👉 Get prompts from environment variables or use built-in default
function getPrompt(promptName) {
  // If no prompt name provided, use built-in default
  if (!promptName) {
    console.log('📝 Using built-in default prompt');
    return DEFAULT_PROMPT;
  }
  
  const envVar = `PROMPT_${promptName.toUpperCase()}`;
  
  if (process.env[envVar]) {
    console.log(`📝 Using prompt: ${promptName.toUpperCase()}`);
    return process.env[envVar];
  }
  
  console.error(`❌ Prompt not found: ${promptName.toUpperCase()}`);
  console.error(`💡 Please add PROMPT_${promptName.toUpperCase()}=... to your .env file`);
  console.error('');
  console.error('📝 Available prompts in .env:');
  
  // List all available prompts from environment
  const availablePrompts = Object.keys(process.env)
    .filter(key => key.startsWith('PROMPT_'))
    .map(key => key.replace('PROMPT_', ''));
  
  if (availablePrompts.length > 0) {
    availablePrompts.forEach(prompt => {
      console.error(`   - ${prompt}`);
    });
  } else {
    console.error('   (No custom prompts found in .env file)');
  }
  console.error('');
  console.error('💡 Or run without prompt name to use built-in default');
  
  process.exit(1);
}

const PROMPT = getPrompt(promptName);

(async () => {
  try {
    const csvInput = fs.readFileSync(fileName, 'utf8');

    console.log(`📤 Sending ${fileName} to ${API_URL}...`);
    if (promptName) {
      console.log(`📝 Using prompt: ${promptName.toUpperCase()}`);
    } else {
      console.log(`📝 Using built-in default prompt`);
    }

    const response = await axios.post(
      API_URL,
      {
        model: AI_MODEL,
        messages: [
          { role: 'system', content: 'You are a CSV-enhancing assistant.' },
          { role: 'user', content: `${PROMPT}\n\n${csvInput}` }
        ],
        temperature: 0.2
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // ✅ Handle server-sent events format
    let responseData = response.data;
    
    // If response.data is a string (like server-sent events), parse it
    if (typeof responseData === 'string') {
      console.log('📥 Received string response, parsing...');
      // Remove SSE format prefix and extract JSON
      const jsonMatch = responseData.match(/\{.*\}$/s);
      if (jsonMatch) {
        try {
          responseData = JSON.parse(jsonMatch[0]);
          console.log('📥 Successfully parsed JSON from string response');
        } catch (parseError) {
          console.error('❌ Failed to parse JSON from response:', parseError.message);
          return;
        }
      } else {
        console.error('❌ No JSON found in string response');
        return;
      }
    }

    // ✅ Debug: Log the response structure
    console.log('📥 API Response Status:', response.status);
    console.log('📥 API Response Data Keys:', Object.keys(responseData || {}));
    
    // ✅ Check if response has expected structure
    if (!responseData || !responseData.choices || !Array.isArray(responseData.choices) || responseData.choices.length === 0) {
      console.error('❌ Invalid API response structure. Full response:');
      console.error(JSON.stringify(responseData, null, 2));
      return;
    }

    if (!responseData.choices[0].message || !responseData.choices[0].message.content) {
      console.error('❌ No content in API response. Choice structure:');
      console.error(JSON.stringify(responseData.choices[0], null, 2));
      return;
    }

    let resultText = responseData.choices[0].message.content.trim();

    // ✅ Remove possible Markdown code fences
    if (resultText.startsWith('```')) {
      resultText = resultText.replace(/```[a-z]*\n?/gi, '').replace(/```$/, '').trim();
    }

    fs.writeFileSync(fileName, resultText, 'utf8');
    console.log(`✅ Updated CSV saved to ${fileName}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.response?.data) {
      console.error('🔎 API Error Details:', JSON.stringify(err.response.data, null, 2));
    }
    if (err.response?.status) {
      console.error('🔎 API Status Code:', err.response.status);
    }
  }
})();
