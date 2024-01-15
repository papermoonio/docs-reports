const axios = require('axios');
const fs = require('fs');
const path = require('path');
const yargs = require('yargs');
const { Parser } = require('json2csv');
const { subDays, subWeeks, startOfDay, endOfDay } = require('date-fns');

require('dotenv').config();

const args = yargs.options({
  'github-username': { type: 'string', demandOption: true, alias: 'u' },
  'github-repo': { type: 'string', demandOption: true, alias: 'r' },
  'start-date': { type: 'string', alias: 's' },
  'stop-date': { type: 'string', alias: 't' },
  'num-days': { type: 'number', alias: 'n' },
}).argv;

const githubUsername = args['github-username'];
const githubRepo = args['github-repo'];
const authToken = process.env.GITHUB_AUTH_TOKEN;
const startDate = args['start-date'];
const stopDate = args['stop-date'];
const numDays = args['num-days'];

// Define the headers for the CSV file
const fields = ['PR #', 'Title', 'Status', 'Labels', 'Link', 'Description', 'Date Merged'];

// Fetch the merged PRs from the last two weeks
async function fetchMergedPRsForLastTwoWeeks() {
  try {
    let start;
    let end;

    if (startDate && stopDate) {
      // Use the provided start and stop dates
      start = new Date(startDate);
      end = endOfDay(new Date(stopDate));
    } else if (startDate && !stopDate) {
      // Fetch PRs from start date to current date
      start = new Date(startDate);
      end = endOfDay(new Date());
    } else if (numDays) {
      // Calculate the date range based on the last N days
      const now = new Date();
      start = subDays(startOfDay(now), numDays);
      end = now;
    } else {
      // Default to the last two weeks
      const now = new Date();
      start = subWeeks(startOfDay(now), 2);
      end = now;
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
      if (mergedDate >= start && mergedDate <= end) {
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

    return prData;
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
  const mergedPRs = await fetchMergedPRsForLastTwoWeeks();
  const openPRs = await fetchOpenPRs();

  const allPRs = [...mergedPRs, ...openPRs];

  // Create the 'csv_output' directory if it doesn't exist
  const fileName = `${githubUsername}_${githubRepo}_biweekly_pr_report.csv`;
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
