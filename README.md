# GitHub Reports & CSV Enhancement

Scripts for generating and enhancing GitHub repository reports with AI-powered improvements.

## Dependencies

- Node.js (v14+)
- GitHub personal access token
- AI API key (OpenAI compatible)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```env
   # Required
   GITHUB_AUTH_TOKEN=your_github_token
   OPENAI_API_KEY=your_ai_api_key

   # Repository & Author Configurations
   PAPERMOON_REPOS="repo1,repo2,repo3"
   PAPERMOON_AUTHORS="user1,user2,user3"
   POLKADOT_REPOS="repo1,repo2"
   POLKADOT_AUTHORS="user1,user2"

   # CSV Formats
   FORMAT_DEFAULT="Repository,Date Opened,Issue/PR URL,Title,Description,Status,Issue Type,Author,Assignees,Reviewers"
   FORMAT_MINIMAL="Title,Author,Reviewers"
   FORMAT_REVIEW="Repository,Author,Assignees,Reviewers,Status,Issue/PR URL"
   FORMAT_MEDIUM="Repository,Date Opened,Issue/PR URL,Title,Description,Status,Issue Type,Author"

   # AI Prompts
   PROMPT_DEFAULT="Your default prompt here"
   PROMPT_CATEGORIZE="Your categorization prompt here"
   ```

## Scripts

### 1. PR/Issue Indexer
```bash
node scripts/pr-indexer.js <repo_input> <output.csv> [authors] [format] [status_filter] [type_filter]
```

**Environment Shortcuts:**
```bash
node scripts/pr-indexer.js output.csv                        # Uses DEFAULT_* from .env
node scripts/pr-indexer.js ENV:PAPERMOON output.csv          # Uses PAPERMOON_* from .env
node scripts/pr-indexer.js ENV:POLKADOT output.csv           # Uses POLKADOT_* from .env
```

**Parameters:**
- `repo_input`: `"owner/repo"`, `"repo1,repo2"`, or `ENV:CONFIG`
- `authors`: `"user1,user2"`, `ENV:CONFIG`, or `""` (uses same config as repo_input)
- `format`: Custom format or `ENV:FORMAT_NAME` (DEFAULT, MINIMAL, REVIEW, MEDIUM)
- `status_filter`: `"open"`, `"closed"`, `"merged"` (can combine with commas)
- `type_filter`: `"pr"`, `"issue"` (optional, defaults to both)

### 2. CSV Enhancer
```bash
node scripts/csv-improve.js <csv_file> [prompt_name]
```
**Required:** `csv_file`  
**Optional:** `prompt_name` (uses PROMPT_{NAME} from .env, defaults to DEFAULT)

### 3. Combined Workflow
```bash
./scripts/csv-generate-and-improve.sh [repo_input] [authors] [output_file] [prompt_name] [status_filter] [type_filter]
```
**All parameters optional** - uses .env defaults when not provided

### 4. Legacy PR Report Generator
```bash
node scripts/generate-PR-report.js -u <org> -r <repo> [-s start_date] [-t end_date] [-n num_days]
```

## Examples

```bash
# Environment-driven usage (recommended)
./scripts/csv-generate-and-improve.sh                                    # Uses defaults
node scripts/pr-indexer.js ENV:PAPERMOON all_prs.csv                    # All items
node scripts/pr-indexer.js ENV:PAPERMOON open_prs.csv ENV:PAPERMOON ENV:REVIEW "open" "pr"

# Manual specification
node scripts/pr-indexer.js "owner/repo" output.csv "user1,user2" "Title,Author,Status" "open"

# Format variations
node scripts/pr-indexer.js ENV:POLKADOT minimal.csv "" ENV:MINIMAL
node scripts/pr-indexer.js ENV:PAPERMOON review.csv "" ENV:REVIEW "open"

# Type filtering
node scripts/pr-indexer.js ENV:PAPERMOON issues.csv "" "" "open" "issue"
node scripts/pr-indexer.js ENV:PAPERMOON prs.csv "" "" "merged" "pr"

# AI enhancement
node scripts/csv-improve.js data.csv DEFAULT
node scripts/csv-improve.js data.csv CATEGORIZE

# Combined workflow with filters
./scripts/csv-generate-and-improve.sh ENV:PAPERMOON "" report.csv DEFAULT "open" "pr"
```

