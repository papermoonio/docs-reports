# GitHub Reports & CSV Enhancement

Scripts for generating and enhancing GitHub repository reports with AI-powered improvements.

## Dependencies

- **Node.js** (v14+ required)
- **GitHub Personal Access Token** (with `repo` scope)
- **AI API Key** (OpenAI compatible for enhancement features)

## Global Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file** (copy from `.env.example`):
   ```env
   # Required API Keys
   GITHUB_AUTH_TOKEN=your_github_personal_access_token_here
   OPENAI_API_KEY=your_ai_api_key_here

   # Repository & Author Configurations
   PAPERMOON_REPOS="repo1,repo2,repo3"
   PAPERMOON_AUTHORS="user1,user2,user3"
   POLKADOT_REPOS="repo1,repo2"
   POLKADOT_AUTHORS="user1,user2"

   # CSV Formats
   FORMAT_DEFAULT="Repository,Date Opened,Issue/PR URL,Title,Description,Status,Issue Type,Author,Assignees,Reviewers"
   FORMAT_MINIMAL="Title,Author,Reviewers"
   FORMAT_REVIEW="Repository,Assignees,Reviewers,Issue/PR URL"
   FORMAT_POLKADOT="Repository,Date Opened,Issue/PR URL,Title,Description,Status,Issue Type,Author"

   # AI Prompts
   PROMPT_DEFAULT="Your default enhancement prompt"
   PROMPT_FORMAT="Your formatting prompt"
   PROMPT_CATEGORIZE="Your categorization prompt"
   ```

---

## Scripts

### 1. PR/Issue Indexer (Main Tool)

**Description:** Fetches issues and pull requests from GitHub repositories with advanced filtering and environment-driven configuration. Supports multiple repositories, author filtering, status filtering, and type filtering.

**Usage:**
```bash
node scripts/pr-indexer.js <repo_input> <output.csv> [authors] [format] [status_filter] [type_filter]
```

**Parameters:**
| Parameter | Type | Required | Description | Examples |
|-----------|------|----------|-------------|----------|
| `repo_input` | String | ✅ **Yes** | Repository specification | `"owner/repo"`, `"repo1,repo2"`, `ENV:PAPERMOON` |
| `output.csv` | String | ✅ **Yes** | Output CSV file path | `"output.csv"`, `"reports/data.csv"` |
| `authors` | String | ❌ No | Author filter | `"user1,user2"`, `ENV:PAPERMOON`, `""` (uses repo config) |
| `format` | String | ❌ No | Output format | `ENV:DEFAULT`, `ENV:MINIMAL`, `ENV:REVIEW`, custom format |
| `status_filter` | String | ❌ No | Status filter | `"open"`, `"closed"`, `"merged"`, `"open,closed"` |
| `type_filter` | String | ❌ No | Item type filter | `"pr"`, `"issue"` (default: both) |

**Environment Shortcuts:**
```bash
# Use predefined configurations
node scripts/pr-indexer.js ENV:PAPERMOON output.csv          # Uses PAPERMOON_* configs
node scripts/pr-indexer.js ENV:POLKADOT output.csv           # Uses POLKADOT_* configs
```

**Example Commands:**
```bash
# Basic usage with environment config
node scripts/pr-indexer.js ENV:PAPERMOON all_data.csv

# Filter only open PRs with review format
node scripts/pr-indexer.js ENV:PAPERMOON open_prs.csv ENV:PAPERMOON ENV:REVIEW "open" "pr"

# Single repository, specific authors
node scripts/pr-indexer.js "owner/repo" output.csv "user1,user2" ENV:DEFAULT "open"

# Multiple repositories, minimal format
node scripts/pr-indexer.js "repo1,repo2,repo3" multi_repo.csv "" ENV:MINIMAL

# Only issues with specific status
node scripts/pr-indexer.js ENV:POLKADOT issues.csv "" ENV:DEFAULT "open,closed" "issue"

# Polkadot Repos
node scripts/pr-indexer.js ENV:POLKADOT issues.csv "" ENV:POLKADOT ENV:POLKADOT
```

**Features:**
- ✅ Fetches both requested and completed reviewers
- ✅ Automatically excludes PR authors from reviewer lists
- ✅ Supports multiple repositories in one command
- ✅ Environment-driven configuration
- ✅ Flexible filtering by author, status, and type
- ✅ Rate limit handling with retries

**Dependencies:**
- `axios` (HTTP requests)
- `csv-writer` (CSV generation)
- `dotenv` (environment variables)

---

### 2. CSV Enhancer

**Description:** Uses AI to enhance CSV descriptions, categorize content, or reformat data based on customizable prompts.

**Usage:**
```bash
node scripts/csv-improve.js <csv_file> [prompt_name] [output_file]
```

**Parameters:**
| Parameter | Type | Required | Description | Examples |
|-----------|------|----------|-------------|----------|
| `csv_file` | String | ✅ **Yes** | Input CSV file path | `"data.csv"`, `"reports/input.csv"` |
| `prompt_name` | String | ❌ No | AI prompt to use | `DEFAULT`, `FORMAT`, `CATEGORIZE` (default: DEFAULT) |
| `output_file` | String | ❌ No | Output file path | `"enhanced.csv"` (default: overwrites input) |

**Example Commands:**
```bash
# Basic enhancement (overwrites original file)
node scripts/csv-improve.js data.csv

# Use specific prompt
node scripts/csv-improve.js data.csv CATEGORIZE

# Save to different file
node scripts/csv-improve.js input.csv FORMAT output.csv

# Chain with indexer
node scripts/pr-indexer.js ENV:PAPERMOON temp.csv && node scripts/csv-improve.js temp.csv DEFAULT final.csv
```

**Available Prompts:**
- `DEFAULT` - Improve descriptions (concise, under 15 words)
- `FORMAT` - Format for review workflows
- `CATEGORIZE` - Add category prefixes like [BUG], [FEATURE], [DOCS]

**Dependencies:**
- `axios` (API requests)
- `dotenv` (environment variables)
- AI API access

---

### 3. Combined Workflow Script

**Description:** Runs PR indexing and CSV enhancement in sequence. All parameters are optional and use .env defaults.

**Usage:**
```bash
./scripts/csv-generate-and-improve.sh [repo_input] [authors] [output_file] [prompt_name] [status_filter] [type_filter]
```

**Parameters:**
| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `repo_input` | String | ❌ No | Repository specification | Uses DEFAULT_* from .env |
| `authors` | String | ❌ No | Author filter | Uses same config as repo |
| `output_file` | String | ❌ No | Output CSV file | `output.csv` |
| `prompt_name` | String | ❌ No | AI prompt name | `DEFAULT` |
| `status_filter` | String | ❌ No | Status filter | All statuses |
| `type_filter` | String | ❌ No | Type filter | Both PRs and issues |

**Example Commands:**
```bash
# Quick start with defaults
./scripts/csv-generate-and-improve.sh

# Specific configuration
./scripts/csv-generate-and-improve.sh ENV:PAPERMOON "" report.csv CATEGORIZE "open" "pr"

# Manual specification
./scripts/csv-generate-and-improve.sh "owner/repo" "user1,user2" custom.csv FORMAT "merged"
```

**Dependencies:**
- All dependencies from PR indexer and CSV enhancer

---

### 4. PR Report Generator

**Description:** Original script for single repository reports with date-based filtering.

**Usage:**
```bash
node scripts/generate-PR-report.js -u <username> -r <repo> [-s start_date] [-t end_date] [-n num_days]
```

**Parameters:**
| Parameter | Short | Type | Required | Description |
|-----------|-------|------|----------|-------------|
| `--github-username` | `-u` | String | ✅ **Yes** | GitHub username/org |
| `--github-repo` | `-r` | String | ✅ **Yes** | Repository name |
| `--start-date` | `-s` | String | ❌ No | Start date (YYYY-MM-DD) |
| `--stop-date` | `-t` | String | ❌ No | End date (YYYY-MM-DD) |
| `--num-days` | `-n` | Number | ❌ No | Days back from today |

**Example Commands:**
```bash
# Last 2 weeks (default)
node scripts/generate-PR-report.js -u moonbeam-foundation -r moonbeam-docs

# Last 30 days
node scripts/generate-PR-report.js -u owner -r repo -n 30

# Specific date range
node scripts/generate-PR-report.js -u owner -r repo -s 2025-01-01 -t 2025-01-31
```

**Output:** Saves to `csv_output/` directory with filename format: `{org}_{repo}_PR_Report_{start}_{end}.csv`

**Dependencies:**
- `yargs` (command line parsing)
- `date-fns` (date handling)

---

## Output Formats

| Format | Columns | Use Case |
|--------|---------|----------|
| **DEFAULT** | Repository, Date Opened, Issue/PR URL, Title, Description, Status, Issue Type, Author, Assignees, Reviewers | Complete data analysis |
| **MINIMAL** | Title, Author, Reviewers | Quick review assignments |
| **REVIEW** | Repository, Assignees, Reviewers, Issue/PR URL | Review workflow focus |
| **POLKADOT** | Repository, Date Opened, Issue/PR URL, Title, Description, Status, Issue Type, Author | Polkadot-specific format |

---

## Quick Start Examples

```bash
# 1. Simple data collection
node scripts/pr-indexer.js ENV:PAPERMOON all_data.csv

# 2. Review-focused workflow
node scripts/pr-indexer.js ENV:PAPERMOON open_prs.csv ENV:PAPERMOON ENV:REVIEW "open" "pr"

# 3. Enhanced workflow
node scripts/pr-indexer.js ENV:POLKADOT issues.csv && node scripts/csv-improve.js issues.csv CATEGORIZE

# 4. One-command solution
./scripts/csv-generate-and-improve.sh ENV:PAPERMOON "" report.csv DEFAULT "open" "pr"

# 5. Chain commands
node scripts/pr-indexer.js ENV:PAPERMOON data.csv ENV:PAPERMOON ENV:POLKADOT && node scripts/csv-improve.js data.csv FORMAT enhanced.csv
```

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

## Quick Start

Run both PR indexer and CSV improver in one command:

```bash
# Make script executable
chmod +x scripts/generate-and-improve.sh

# Run with repository URL
./scripts/generate-and-improve.sh https://github.com/username/repo

# Run with authors
./scripts/generate-and-improve.sh https://github.com/username/repo "author1,author2"

# Run with custom output file
./scripts/generate-and-improve.sh https://github.com/username/repo "author1,author2" output.csv
```

Note: Make sure your `.env` file has the required API keys.

