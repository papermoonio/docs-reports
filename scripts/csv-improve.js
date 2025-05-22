require('dotenv').config();
const fs = require('fs');
const axios = require('axios');

const API_URL = 'https://api.kluster.ai/v1/chat/completions';
const fileName = process.argv[2];

if (!fileName) {
  console.error('❌ Please specify a CSV file: node csv-improve.js yourfile.csv');
  process.exit(1);
}

// 👉 Define your instruction
const PROMPT = `
You will receive a CSV dataset below. For Description column, generate a concise description under 30 words based on the data from the description column.
Return the full updated CSV, with updated "description" field with the new description. Don't change any other column.
Only respond with CSV, no explanation or extra text.
`;

(async () => {
  try {
    const csvInput = fs.readFileSync(fileName, 'utf8');

    console.log(`📤 Sending ${fileName} as raw CSV to ${API_URL}...`);

    const response = await axios.post(
      API_URL,
      {
        model: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8',
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

    let resultText = response.data.choices[0].message.content.trim();

    // ✅ Remove possible Markdown code fences
    if (resultText.startsWith('```')) {
      resultText = resultText.replace(/```[a-z]*\n?/gi, '').replace(/```$/, '').trim();
    }

    fs.writeFileSync(fileName, resultText, 'utf8');
    console.log(`✅ Updated CSV saved to ${fileName}`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.response?.data) {
      console.error('🔎 Details:', JSON.stringify(err.response.data, null, 2));
    }
  }
})();
