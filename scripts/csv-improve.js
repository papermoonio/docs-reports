require('dotenv').config();
const fs = require('fs');
const axios = require('axios');

const API_URL = process.env.API_URL;
const AI_MODEL = process.env.AI_MODEL;
const fileName = process.argv[2];
const promptName = process.argv[3];
const outputFileName = process.argv[4]; // Optional output file parameter

if (!fileName) {
  console.error('❌ Usage: node csv-improve.js <input_file> [prompt_name] [output_file]');
  console.error('');
  console.error('📝 Supports both .csv and .txt files');
  console.error('📝 If no prompt_name is provided, default prompt will be used');
  console.error('📝 If no output_file is provided, input file will be overwritten');
  console.error('📝 Custom prompts must be defined in .env file with format: PROMPT_NAME=...');
  console.error('');
  console.error('💡 Usage examples:');
  console.error('   node csv-improve.js data.csv                    # Uses default prompt, overwrites input');
  console.error('   node csv-improve.js data.csv TECHNICAL          # Uses PROMPT_TECHNICAL, overwrites input');
  console.error('   node csv-improve.js data.txt CATEGORIZE         # Uses PROMPT_CATEGORIZE, overwrites input');
  console.error('   node csv-improve.js data.csv DEFAULT output.csv # Saves to output.csv');
  console.error('   node csv-improve.js data.txt SORTING result.txt # Saves to result.txt');
  process.exit(1);
}

// 👉 Default prompt built into the script
const DEFAULT_PROMPT = `You will receive a CSV dataset below. For Description column, generate a concise description under 15 words based on the data from the description column. Return the full updated CSV, with updated description field with the new description. Don't change any other column. Only respond with CSV, no explanation or extra text.`;

// 👉 Get file extension
function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

// 👉 Determine output filename
function getOutputFileName(inputFile, outputFile) {
  if (outputFile) {
    return outputFile;
  }
  // If no output file specified, overwrite the input file
  return inputFile;
}

// 👉 Get appropriate prompt based on file type
function getDefaultPromptForFileType(fileExtension) {
  if (fileExtension === 'txt') {
    return `You will receive text content below. Improve and enhance the text while maintaining its original structure and meaning. Make it more clear, concise, and professional. Return only the improved text, no explanation or extra content.`;
  }
  return DEFAULT_PROMPT; // Default CSV prompt
}

// 👉 Get prompts from environment variables or use built-in default
function getPrompt(promptName, fileExtension) {
  // If no prompt name provided, use built-in default for file type
  if (!promptName) {
    console.log(`📝 Using built-in default prompt for .${fileExtension} file`);
    return getDefaultPromptForFileType(fileExtension);
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
  console.error(`❗ Falling back to built-in default prompt for .${fileExtension} file`);
  
  return getDefaultPromptForFileType(fileExtension);
}

// 👉 Get file info and determine output
const fileExtension = getFileExtension(fileName);
const outputFile = getOutputFileName(fileName, outputFileName);
const PROMPT = getPrompt(promptName, fileExtension);

(async () => {
  try {
    const fileInput = fs.readFileSync(fileName, 'utf8');
    
    // 👉 Dynamic system message based on file type
    const systemMessage = fileExtension === 'txt' 
      ? 'You are a text enhancement assistant.'
      : 'You are a CSV-enhancing assistant.';

    console.log(`📤 Sending ${fileName} (${fileExtension.toUpperCase()}) to ${API_URL}...`);
    if (promptName) {
      console.log(`📝 Using prompt: ${promptName.toUpperCase()}`);
    } else {
      console.log(`📝 Using built-in default prompt for .${fileExtension} files`);
    }

    const response = await axios.post(
      API_URL,
      {
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: `${PROMPT}\n\n${fileInput}` }
        ],
        temperature: 0.1
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

    fs.writeFileSync(outputFile, resultText, 'utf8');
    
    // 👉 Success message based on file type
    const fileTypeLabel = fileExtension.toUpperCase();
    if (outputFile === fileName) {
      console.log(`✅ Updated ${fileTypeLabel} saved to ${outputFile}`);
    } else {
      console.log(`✅ Enhanced ${fileTypeLabel} saved to ${outputFile}`);
    }
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
