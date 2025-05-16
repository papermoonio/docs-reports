const axios = require('axios');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
require('dotenv').config();

const headers = {
  Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
};

function extractInfo(item) {
  // Clean and prepare the description
  let description = item.body || '';
  // Remove any null characters and normalize line endings
  description = description.replace(/\0/g, '').replace(/\r\n/g, '\n');
  
  const info = {
    dateOpened: item.created_at,
    url: item.html_url,
    title: item.title || '',
    description: description,
    status: item.state === 'closed' && item.pull_request?.merged_at ? 'Merged' : capitalize(item.state),
    issueType: item.pull_request ? 'PR' : 'Issue',
    author: item.user.login
  };

  // Log the processed item with more details
  console.log(`Processed: ${info.title} (${info.issueType})`);
  console.log(`Description length: ${info.description.length}`);
  console.log(`Description preview: ${info.description.substring(0, 100)}...`);
  
  return info;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function filterByAuthors(items, authorsCSV) {
  if (!authorsCSV) return items;

  const authorList = authorsCSV.split(',').map(name => name.trim().toLowerCase());
  const filtered = items.filter(item => authorList.includes(item.user.login.toLowerCase()));
  console.log(`Filtered ${items.length} items to ${filtered.length} items for authors: ${authorList.join(', ')}`);
  return filtered;
}

async function getAllIssuesAndPRs(owner, repo) {
  const all = [];
  let page = 1;
  while (true) {
    const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100&page=${page}&filter=all`;
    console.log(`Fetching page ${page}...`);
    try {
      const { data } = await axios.get(url, { headers });
      if (data.length === 0) break;

      console.log(`Retrieved ${data.length} items from page ${page}`);
      if (page === 1 && data.length > 0) {
        console.log('First item sample:', {
          title: data[0].title,
          hasBody: !!data[0].body,
          bodyLength: data[0].body ? data[0].body.length : 0
        });
      }

      all.push(...data);
      page++;
    } catch (error) {
      console.error('Error fetching data:', error.message);
      if (error.response) {
        console.error('API Response:', error.response.data);
      }
      break;
    }
  }
  return all;
}

async function writeToCSV(data, outputPath) {
  console.log(`Writing ${data.length} items to CSV...`);
  
  // Log the first item's data to verify content
  if (data.length > 0) {
    console.log('First item being written to CSV:');
    console.log({
      title: data[0].title,
      descriptionLength: data[0].description.length,
      descriptionPreview: data[0].description.substring(0, 100)
    });
  }

  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: 'dateOpened', title: 'Date Opened' },
      { id: 'url', title: 'Issue/PR URL' },
      { id: 'title', title: 'Title' },
      { id: 'description', title: 'Description' },
      { id: 'status', title: 'Status' },
      { id: 'issueType', title: 'Issue Type' },
      { id: 'author', title: 'Author' },
    ],
    fieldDelimiter: ',',
    recordDelimiter: '\n',
    alwaysQuote: true, // This ensures all fields are properly quoted
  });

  try {
    const sorted = data.sort((a, b) => new Date(a.dateOpened) - new Date(b.dateOpened));
    
    // Verify data before writing
    console.log('Verifying data before writing:');
    sorted.forEach((item, index) => {
      if (index < 3) { // Log first 3 items
        console.log(`Item ${index + 1}:`);
        console.log(`- Title: ${item.title}`);
        console.log(`- Description length: ${item.description.length}`);
        console.log(`- Description preview: ${item.description.substring(0, 100)}...`);
      }
    });

    await csvWriter.writeRecords(sorted);
    console.log(`✅ CSV saved to ${outputPath} with ${sorted.length} entries.`);
  } catch (error) {
    console.error('Error writing CSV:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
}

async function main() {
  const [,, repoURL, outputCSV, authorsCSV] = process.argv;

  if (!repoURL || !outputCSV) {
    console.error('Usage: node pr-indexer.js <repo_url> <output_csv_path> [optional_authors]');
    return;
  }

  const match = repoURL.match(/github\.com\/([^/]+)\/([^/]+)(\/|$)/);
  if (!match) {
    console.error('❌ Invalid GitHub repo URL');
    return;
  }

  const [, owner, repo] = match;
  console.log(`Processing repository: ${owner}/${repo}`);

  try {
    const rawData = await getAllIssuesAndPRs(owner, repo);
    console.log(`Retrieved ${rawData.length} total items`);
    
    const filtered = filterByAuthors(rawData, authorsCSV);
    console.log(`Filtered to ${filtered.length} items`);
    
    const simplified = filtered.map(extractInfo);
    console.log(`Processed ${simplified.length} items`);
    
    await writeToCSV(simplified, outputCSV);
  } catch (error) {
    console.error('Error in main process:', error.message);
  }
}

main();
