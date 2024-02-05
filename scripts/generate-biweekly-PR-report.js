const axios = require('axios');
const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const { Parser } = require('json2csv');
const { subWeeks, startOfDay, format } = require('date-fns');

require('dotenv').config();

const args = yargs.options({
  'github-username': { type: 'string', demandOption: true, alias: 'u' },
  'github-repo': { type: 'string', demandOption: true, alias: 'r' },
  from: { type: 'string', demandOption: false, alias: 'f' },
  to: { type: 'string', demandOption: false, alias: 't' },
}).argv;

const githubUsername = args['github-username'];
const githubRepo = args['github-repo'];
const authToken = process.env.GITHUB_AUTH_TOKEN;

// Define the headers for the CSV file
const fields = ['PR #', 'Title', 'Status', 'Labels', 'Link', 'Description', 'Date Merged'];

// Fetch the merged PRs
async function fetchMergedPRs() {
  try {
    let dateStart;
    let dateEnd;
    const now = new Date();
    if (args['from'] && args['to']) {
      // Calcualte date between to inputs
      dateStart = new Date(args['from']);
      dateEnd = new Date(args['to']);
    } else if (args['from']) {
      // Calculate date from given input to now
      dateStart = new Date(args['from']);
      dateEnd = now;
    } else {
      // Calculate the date range for the last two weeks
      dateStart = subWeeks(startOfDay(now), 2); // Start of the last two weeks
      dateEnd = now; // Current date
    }

    const response = await axios.get(
      `https://api.github.com/repos/${githubUsername}/${githubRepo}/pulls?state=closed&sort=updated&direction=desc`,
      {
        headers: {
          Authorization: `token ${authToken}`,
        },
      }
    );

    const prs = response.data;
    const prData = [];

    for (const pr of prs) {
      const mergedDate = new Date(pr.merged_at);
      if (mergedDate >= dateStart && mergedDate <= dateEnd) {
        const labels = pr.labels.map((label) => label.name).join(', ');
        const description = extractDescription(pr.body);

        prData.push({
          'PR #': pr.number,
          Title: pr.title,
          Status: 'Merged', // Set merged PRs to "Merged" status
          Labels: labels,
          Link: pr.html_url,
          Description: description,
          'Date Merged': pr.merged_at,
        });
      }
    }

    // Sort the PRs by the 'Labels' column
    prData.sort((a, b) => (a.Labels < b.Labels ? -1 : 1));

    return [prData, dateStart, dateEnd];
  } catch (error) {
    console.error('Error fetching PRs:', error);
    return [];
  }
}

// Fetch all open PRs
async function fetchOpenPRs() {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${githubUsername}/${githubRepo}/pulls?state=open`,
      {
        headers: {
          Authorization: `token ${authToken}`,
        },
      }
    );

    const prs = response.data;
    const prData = [];

    for (const pr of prs) {
      const labels = pr.labels.map((label) => label.name).join(', ');
      const description = extractDescription(pr.body);

      prData.push({
        'PR #': pr.number,
        Title: pr.title,
        Status: 'Open', // Set open PRs to "Open" status
        Labels: labels,
        Link: pr.html_url,
        Description: description,
        'Date Merged': 'n/a', // Open PRs don't have a merge date
      });
    }

    // Sort the PRs by the 'Labels' column
    prData.sort((a, b) => (a.Labels < b.Labels ? -1 : 1));

    return prData;
  } catch (error) {
    console.error('Error fetching open PRs:', error);
    return [];
  }
}

// Extract the description under '### Detailed summary' header and stop at '>'
function extractDescription(body) {
  const regex = /### Detailed summary([\s\S]*?)(?=\s*>|$)/;
  const match = body.match(regex);

  if (match) {
    return match[1].trim();
  }

  return '';
}

// Main function to fetch data, sort, and create CSV
async function main() {
  const [mergedPRs, dateStart, dateEnd] = await fetchMergedPRs();
  const openPRs = await fetchOpenPRs();

  const allPRs = [...mergedPRs, ...openPRs];

  // Create the 'csv_output' directory if it doesn't exist
  const fileName = `${githubUsername}_${githubRepo}_PR_Report_${dateStart
    .toISOString()
    .slice(0, 10)}_${dateEnd.toISOString().slice(0, 10)}.csv`;
  const outputPath = 'csv_output/' + fileName;
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (allPRs.length > 0) {
    const parser = new Parser({ fields });
    const csv = parser.parse(allPRs);

    fs.writeFileSync(outputPath, csv);
    console.log(`CSV file created: ${fileName}`);
  } else {
    console.log('No PRs found in the specified time range.');
  }
}

main();
