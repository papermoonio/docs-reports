# docs-reports

Scripts for generating reports for documentation repos.

## PR report script

To generate a report on the changes made to the docs site, which, by default, includes the PRs merged and all open PRs, you can use the `generate-PR-report.js` script.

To run the script, you will need to create a `.env` file in the same directory as the script. Your `.env` file will need to contain the same variables defined in the `.env.example` file.

The script accepts these inputs:

- `--github-username` or `-u` - the GitHub username or org name that owns the docs repo you want to generate a report for
- `--github-repo` or `-r` - the GitHub repo name of the docs you want to generate a report for
- `--start-date` or `s` - the date to start including merged PRs
- `--stop-date` or `t` - the date to stop including merged PRs
- `--num-days` or `n` - the number of previous days to include merged PRs from

Note: If `--start-date`, `--stop-date`, or `--num-days` is not provided, the PRs merged within the last two weeks will be pulled.

Then you can run the script using the following command:

```bash
node scripts/generate-PR-report.js -u INSERT_GITHUB_USERNAME -r INSERT_REPO_NAME
```

The output of the script will appear in the `csv_output` directory.

## GitHub PR/Issue Indexer

This script fetches issues and pull requests from a GitHub repository and saves them to a CSV file. It can filter by specific authors and includes details like title, description, status, and more.

## Prerequisites

- Node.js installed on your system
- A GitHub personal access token with `repo` scope

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file with your GitHub token added:
   ```
   GITHUB_AUTH_TOKEN=your_github_token_here
   ```

### How to use

Run the script using the following command:

```bash
node pr-indexer.js <github_repo_url> <output_csv_path> [optional_authors]
```

#### Parameters:

- `github_repo_url`: The URL of the GitHub repository (e.g., https://github.com/username/repo)
- `output_csv_path`: The path where the CSV file will be saved. You can manually define the name of the output file (e.g., output.csv)
- `optional_authors`: (Optional) Comma-separated list of GitHub usernames to filter by. 

#### Examples:

1. Get all issues and PRs from a repository:
   ```bash
   node pr-indexer.js https://github.com/username/repo output.csv
   ```

2. Get issues and PRs from specific authors:
   ```bash
   node pr-indexer.js https://github.com/username/repo output.csv "author1,author2,author3"
   ```

### Output

The script generates a CSV file with the following columns:
- Date Opened
- Issue/PR URL
- Title
- Description
- Status (Open, Closed, or Merged)
- Issue Type (PR or Issue)
- Author

The output is sorted by date (oldest to newest).

### Dependencies

- axios
- csv-writer
- dotenv

## CSV Description Improver

This script calls the AI model with your preferred options; It sends the CSV file to the AI model and it updated the description column with the new description

### Prerequisites

- OpenAI API key // or any other AI model provider

### Setup

1. Make sure you have the required dependencies installed:
   ```bash
   npm install
   ```
2. Create a `.env` file with your OpenAI API key added:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

### How to use

Run the script using the following command:

```bash
node scripts/csv-improve.js <input_csv_file>
```

#### Parameters:

- `input_csv_file`: The path to the CSV file you want to improve

#### Example:

```bash
node scripts/csv-improve.js output.csv
```

### What it does

The script will:
1. Read the specified CSV file
2. Send the content to OpenAI's API
3. Generate improved, concise descriptions (under 30 words)
4. Save the updated CSV back to the same file

### Configurable Variables

You can modify the following variables in the `scripts/csv-improve.js` file:

- `API_URL`: The endpoint URL for the AI model API (default: 'https://api.kluster.ai/v1/chat/completions')
- `PROMPT`: The instruction template for the AI model. You can customize this field to change the instruction for the AI model
- `model`: The AI model to use (default: 'meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8')
- `temperature`: Controls the randomness of the output (default: 0.2)
  - Lower values (like 0.2) make the output more focused and deterministic
  - Higher values (up to 1.0) make the output more creative but less predictable

### Dependencies

- axios
- dotenv
- OpenAI API access

