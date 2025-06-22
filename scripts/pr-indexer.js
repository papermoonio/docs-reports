const axios = require('axios');
const fs = require('fs');
const { createObjectCsvWriter } = require('csv-writer');
require('dotenv').config();

const headers = {
  Authorization: `Bearer ${process.env.GITHUB_AUTH_TOKEN}`,
  Accept: 'application/vnd.github+json',
};

function extractInfo(item) {
  // Clean and prepare the description
  let description = item.body || '';
  // Remove any null characters and normalize line endings
  description = description.replace(/\0/g, '').replace(/\r\n/g, '\n');
  
  // Extract assignees
  const assignees = item.assignees ? item.assignees.map(assignee => assignee.login).join(', ') : '';
  
  // Extract reviewers (for PRs only)
  let reviewers = '';
  if (item.pull_request && item.requested_reviewers) {
    const userReviewers = item.requested_reviewers.map(reviewer => reviewer.login);
    const teamReviewers = item.requested_teams ? item.requested_teams.map(team => `@${team.slug}`) : [];
    const allReviewers = [...userReviewers, ...teamReviewers];
    reviewers = allReviewers.join(', ');
  }
  
  const info = {
    dateOpened: item.created_at,
    url: item.html_url,
    title: item.title || '',
    description: description,
    status: item.state === 'closed' && item.pull_request?.merged_at ? 'Merged' : capitalize(item.state),
    issueType: item.pull_request ? 'PR' : 'Issue',
    author: item.user.login,
    assignees: assignees,
    reviewers: reviewers
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

function filterByStatus(items, statusFilter) {
  if (!statusFilter) return items;

  const statusList = statusFilter.split(',').map(status => status.trim().toLowerCase());
  const filtered = items.filter(item => {
    const itemStatus = item.state === 'closed' && item.pull_request?.merged_at ? 'merged' : item.state.toLowerCase();
    return statusList.includes(itemStatus);
  });
  
  console.log(`Filtered ${items.length} items to ${filtered.length} items for status: ${statusList.join(', ')}`);
  return filtered;
}

function filterByType(items, typeFilter) {
  if (!typeFilter) return items;

  const type = typeFilter.trim().toLowerCase();
  let filtered;
  
  if (type === 'pr') {
    filtered = items.filter(item => item.pull_request);
  } else if (type === 'issue') {
    filtered = items.filter(item => !item.pull_request);
  } else {
    console.error(`❌ Invalid type filter: ${typeFilter}`);
    console.error('💡 Valid options: "pr", "issue"');
    return items;
  }
  
  console.log(`Filtered ${items.length} items to ${filtered.length} items for type: ${type}`);
  return filtered;
}

async function enrichPRWithReviewers(owner, repo, item) {
  // Only fetch additional data for PRs
  if (!item.pull_request) {
    return item;
  }
  
  const prNumber = item.number;
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`;
      const { data: prData } = await axios.get(prUrl, { headers });
      
      // Merge the PR-specific data with the original item
      return {
        ...item,
        requested_reviewers: prData.requested_reviewers || [],
        requested_teams: prData.requested_teams || []
      };
    } catch (error) {
      const status = error.response?.status;
      
      if (status === 503) {
        // Service unavailable - retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          console.warn(`⚠️  Service unavailable for PR #${prNumber}, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          console.warn(`❌ Service unavailable for PR #${prNumber} after ${maxRetries} attempts, skipping`);
        }
      } else if (status === 403) {
        console.warn(`⚠️  No access to PR #${prNumber} (403 - insufficient permissions)`);
      } else if (status === 404) {
        console.warn(`⚠️  PR #${prNumber} not found (404)`);
      } else {
        console.warn(`Failed to fetch PR details for #${prNumber}: ${error.message}`);
      }
      
      return item; // Return original item if we can't get PR details
    }
  }
  
  return item; // Fallback return
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

async function writeToCSV(data, outputPath, formatString = null) {
  console.log(`Writing ${data.length} items to CSV...`);
  
  // Parse the column format
  const headers = parseColumnFormat(formatString);
  
  // Log format information
  if (formatString) {
    console.log(`📋 Using custom format: ${headers.map(h => h.title).join(', ')}`);
  } else {
    console.log('📋 Using default format (all columns)');
  }
  
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
    header: headers,
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

function parseRepoInput(input) {
  // Handle comma-separated list of repos
  const repos = input.split(',').map(repo => repo.trim());
  const parsedRepos = [];

  for (const repo of repos) {
    let owner, repoName;
    
    // Check if it's a full URL
    const urlMatch = repo.match(/github\.com\/([^/]+)\/([^/]+)(\/|$)/);
    if (urlMatch) {
      [, owner, repoName] = urlMatch;
    } else {
      // Check if it's in owner/repo format
      const parts = repo.split('/');
      if (parts.length === 2) {
        [owner, repoName] = parts;
      } else {
        console.error(`❌ Invalid repository format: ${repo}`);
        console.error('   Expected formats: "owner/repo" or "https://github.com/owner/repo"');
        continue;
      }
    }

    parsedRepos.push({ owner, repo: repoName, originalInput: repo });
  }

  return parsedRepos;
}

async function processRepository(owner, repo, authorsCSV, statusFilter, typeFilter) {
  console.log(`\n📁 Processing repository: ${owner}/${repo}`);
  
  try {
    const rawData = await getAllIssuesAndPRs(owner, repo);
    console.log(`   Retrieved ${rawData.length} total items`);
    
    // Enrich PRs with reviewer information
    console.log(`   Enriching PRs with reviewer data...`);
    const prs = rawData.filter(item => item.pull_request);
    const issues = rawData.filter(item => !item.pull_request);
    
    const enrichedPRs = await Promise.all(
      prs.map(pr => enrichPRWithReviewers(owner, repo, pr))
    );
    
    const enrichedData = [...issues, ...enrichedPRs];
    console.log(`   Enriched ${prs.length} PRs with reviewer data`);
    
    // Apply status filtering
    const statusFiltered = filterByStatus(enrichedData, statusFilter);
    console.log(`   Status filtered to ${statusFiltered.length} items`);
    
    // Apply type filtering
    const typeFiltered = filterByType(statusFiltered, typeFilter);
    console.log(`   Type filtered to ${typeFiltered.length} items`);
    
    const authorFiltered = filterByAuthors(typeFiltered, authorsCSV);
    console.log(`   Author filtered to ${authorFiltered.length} items`);
    
    const simplified = authorFiltered.map(item => {
      const extracted = extractInfo(item);
      // Add repository information to each item
      extracted.repository = `${owner}/${repo}`;
      return extracted;
    });
    console.log(`   Processed ${simplified.length} items`);
    
    return simplified;
  } catch (error) {
    console.error(`❌ Error processing ${owner}/${repo}:`, error.message);
    return [];
  }
}

async function main() {
  const [,, repoInput, outputCSV, authorsCSV, formatConfig, statusFilter, typeFilter] = process.argv;

  // Check if we should use environment variables (when only output file is provided)
  if (repoInput && !outputCSV && repoInput.endsWith('.csv')) {
    // User provided only output file - use environment variables
    const outputFile = repoInput;
    const envRepos = process.env.DEFAULT_REPOS;
    const envAuthors = process.env.DEFAULT_AUTHORS;
    
    if (!envRepos) {
      console.error('❌ DEFAULT_REPOS not found in .env file');
      console.error('💡 Add DEFAULT_REPOS="repo1,repo2" to your .env file');
      return;
    }
    
    console.log('🔧 Using environment variables:');
    console.log(`   Repositories: ${envRepos}`);
    console.log(`   Authors: ${envAuthors || 'All authors'}`);
    console.log(`   Output: ${outputFile}`);
    console.log('');
    
    await processWithConfig(envRepos, outputFile, envAuthors, undefined, undefined, undefined);
    return;
  }
  
  // Check for environment variable shortcuts
  if (repoInput && repoInput.startsWith('ENV:')) {
    const configName = repoInput.replace('ENV:', '').toUpperCase();
    const envRepos = process.env[`${configName}_REPOS`];
    const envAuthors = process.env[`${configName}_AUTHORS`];
    
    if (!envRepos) {
      console.error(`❌ ${configName}_REPOS not found in .env file`);
      console.error(`💡 Add ${configName}_REPOS="repo1,repo2" to your .env file`);
      listAvailableConfigs();
      return;
    }
    
    if (!outputCSV) {
      console.error('❌ Output CSV file required when using ENV: shortcuts');
      console.error(`💡 Usage: node pr-indexer.js ENV:${configName} output.csv`);
      return;
    }
    
    console.log(`🔧 Using ${configName} configuration:`);
    console.log(`   Repositories: ${envRepos}`);
    console.log(`   Authors: ${envAuthors || 'All authors'}`);
    console.log(`   Output: ${outputCSV}`);
    console.log('');
    
    await processWithConfig(envRepos, outputCSV, envAuthors, formatConfig, statusFilter, typeFilter);
    return;
  }

  // Standard usage validation
  if (!repoInput || !outputCSV) {
    console.error('Usage: node pr-indexer.js <repo_input> <output_csv_path> [authors] [format] [status_filter] [type_filter]');
    console.error('');
    console.error('🔧 Environment Variable Shortcuts:');
    console.error('  node pr-indexer.js <output.csv>                           # Uses DEFAULT_* from .env');
    console.error('  node pr-indexer.js ENV:<config> <output.csv>              # Uses <CONFIG>_* from .env');
    console.error('');
    listAvailableConfigs();
    console.error('');
    console.error('📝 Manual Usage:');
    console.error('repo_input can be:');
    console.error('  - Single repo: "owner/repo" or "https://github.com/owner/repo"');
    console.error('  - Multiple repos: "owner1/repo1,owner2/repo2,owner3/repo3"');
    console.error('');
    console.error('authors (optional): Comma-separated list of GitHub usernames');
    console.error('format (optional): Column format or ENV:FORMAT_NAME shortcut');
    console.error('status_filter (optional): Comma-separated list of statuses');
    console.error('  - Available statuses: open, closed, merged');
    console.error('type_filter (optional): Filter by item type');
    console.error('  - Available types: pr, issue');
    console.error('');
    console.error('Examples:');
    console.error('  node pr-indexer.js team_report.csv                                         # Use DEFAULT_* config');
    console.error('  node pr-indexer.js ENV:moonbeam moonbeam_report.csv                        # Use MOONBEAM_* config');
    console.error('  node pr-indexer.js "owner/repo" output.csv "" "ENV:MINIMAL"               # With custom format');
    console.error('  node pr-indexer.js ENV:polkadot polkadot_open.csv "" "" "open"            # With status filter');
    console.error('  node pr-indexer.js ENV:polkadot polkadot_prs.csv "" "" "open" "pr"        # Only open PRs');
    console.error('  node pr-indexer.js "owner/repo" manual_output.csv "author1,author2"       # Manual mode');
    return;
  }

  await processWithConfig(repoInput, outputCSV, authorsCSV, formatConfig, statusFilter, typeFilter);
}

function listAvailableConfigs() {
  console.error('🔧 Available environment configurations:');
  const configs = Object.keys(process.env)
    .filter(key => key.endsWith('_REPOS'))
    .map(key => key.replace('_REPOS', '').toLowerCase());
  
  if (configs.length > 0) {
    configs.forEach(config => {
      const repos = process.env[`${config.toUpperCase()}_REPOS`];
      const authors = process.env[`${config.toUpperCase()}_AUTHORS`];
      console.error(`  - ENV:${config} (${repos ? repos.split(',').length : 0} repos, ${authors ? authors.split(',').length : 'all'} authors)`);
    });
  } else {
    console.error('  (No configurations found - add *_REPOS variables to .env)');
  }
}

function resolveEnvValue(input, type) {
  if (!input || !input.startsWith('ENV:')) {
    return input;
  }
  
  const configName = input.replace('ENV:', '').toUpperCase();
  let envVar;
  
  if (type === 'format') {
    envVar = `FORMAT_${configName}`;
  } else {
    envVar = `${configName}_${type.toUpperCase()}`;
  }
  
  const value = process.env[envVar];
  
  if (!value) {
    console.error(`❌ ${envVar} not found in .env file`);
    if (type === 'format') {
      console.error(`💡 Add ${envVar}="column1,column2,column3" to your .env file`);
      listAvailableFormats();
    } else if (type === 'authors') {
      console.error(`💡 Add ${envVar}="author1,author2,author3" to your .env file`);
    }
    return null;
  }
  
  return value;
}

function listAvailableFormats() {
  console.error('');
  console.error('📋 Available format configurations:');
  const availableFormats = Object.keys(process.env)
    .filter(key => key.startsWith('FORMAT_'))
    .map(key => key.replace('FORMAT_', ''));
  
  if (availableFormats.length > 0) {
    availableFormats.forEach(format => {
      const columns = process.env[`FORMAT_${format}`];
      console.error(`   - ENV:${format} → ${columns}`);
    });
  } else {
    console.error('   No format configurations found in .env file');
  }
  console.error('');
}

function parseColumnFormat(formatString) {
  if (!formatString) {
    // Default format with all columns
    return [
      { id: 'repository', title: 'Repository' },
      { id: 'dateOpened', title: 'Date Opened' },
      { id: 'url', title: 'Issue/PR URL' },
      { id: 'title', title: 'Title' },
      { id: 'description', title: 'Description' },
      { id: 'status', title: 'Status' },
      { id: 'issueType', title: 'Issue Type' },
      { id: 'author', title: 'Author' },
      { id: 'assignees', title: 'Assignees' },
      { id: 'reviewers', title: 'Reviewers' }
    ];
  }
  
  const columnMapping = {
    'Repository': { id: 'repository', title: 'Repository' },
    'Date Opened': { id: 'dateOpened', title: 'Date Opened' },
    'Issue/PR URL': { id: 'url', title: 'Issue/PR URL' },
    'Title': { id: 'title', title: 'Title' },
    'Description': { id: 'description', title: 'Description' },
    'Status': { id: 'status', title: 'Status' },
    'Issue Type': { id: 'issueType', title: 'Issue Type' },
    'Author': { id: 'author', title: 'Author' },
    'Assignees': { id: 'assignees', title: 'Assignees' },
    'Reviewers': { id: 'reviewers', title: 'Reviewers' }
  };
  
  const requestedColumns = formatString.split(',').map(col => col.trim());
  const headers = [];
  
  requestedColumns.forEach(columnName => {
    if (columnMapping[columnName]) {
      headers.push(columnMapping[columnName]);
    } else {
      console.warn(`⚠️  Unknown column: ${columnName}`);
    }
  });
  
  return headers;
}

async function processWithConfig(repoInput, outputCSV, authorsCSV, formatConfig, statusFilter, typeFilter) {
  const repositories = parseRepoInput(repoInput);
  
  if (repositories.length === 0) {
    console.error('❌ No valid repositories found to process');
    return;
  }

  console.log(`🚀 Processing ${repositories.length} repository(ies):`);
  repositories.forEach(({ owner, repo }) => {
    console.log(`   - ${owner}/${repo}`);
  });

  // Resolve ENV: shortcuts for authors
  if (authorsCSV) {
    authorsCSV = resolveEnvValue(authorsCSV, 'authors');
    if (!authorsCSV) return; // Exit if ENV resolution failed
    console.log(`👥 Filtering by authors: ${authorsCSV}`);
  }
  
  if (statusFilter) {
    console.log(`📊 Filtering by status: ${statusFilter}`);
  }
  
  if (typeFilter) {
    console.log(`🔍 Filtering by type: ${typeFilter}`);
  }

  try {
    let allData = [];
    
    // Process each repository
    for (const { owner, repo } of repositories) {
      const repoData = await processRepository(owner, repo, authorsCSV, statusFilter, typeFilter);
      allData.push(...repoData);
    }

    console.log(`\n📊 Total items collected: ${allData.length}`);
    
    if (allData.length > 0) {
      // Resolve format configuration
      let columnFormat = resolveEnvValue(formatConfig, 'format');
      
      // Write to CSV with custom format
      await writeToCSV(allData, outputCSV, columnFormat);
      console.log(`\n✅ Successfully processed ${repositories.length} repository(ies)`);
      console.log(`📄 Combined data saved to: ${outputCSV}`);
    } else {
      console.log('\n⚠️  No data found across all repositories');
    }
  } catch (error) {
    console.error('❌ Error in main process:', error.message);
  }
}

main();
