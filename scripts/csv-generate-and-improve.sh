#!/bin/bash

# Function to load environment variables from .env file
load_env() {
    if [ -f ".env" ]; then
        set -a  # automatically export all variables
        source .env
        set +a  # stop automatically exporting
    fi
}

# Load environment variables
load_env

# Function to show usage
show_usage() {
    echo "Usage: ./csv-generate-and-improve.sh [repo_url] [authors] [output_file] [prompt_name] [status_filter]"
    echo ""
    echo "Parameters (all optional when using .env defaults):"
    echo "  repo_url:      Single repo (owner/repo), multiple repos (repo1,repo2), or ENV:config"
    echo "  authors:       Comma-separated list of GitHub usernames"
    echo "  output_file:   Output CSV filename (default: output.csv)" 
    echo "  prompt_name:   AI prompt name from .env (default: DEFAULT)"
    echo "  status_filter: Comma-separated list: open,closed,merged"
    echo ""
    echo "Environment-driven usage (no arguments):"
    echo "  ./csv-generate-and-improve.sh              # Uses DEFAULT_REPOS, DEFAULT_AUTHORS, etc."
    echo ""
    echo "Command-line usage:"
    echo "  ./csv-generate-and-improve.sh \"org/repo\""
    echo "  ./csv-generate-and-improve.sh \"org/repo\" \"author1,author2\" custom.csv TECHNICAL"
    echo "  ./csv-generate-and-improve.sh ENV:moonbeam \"\" output.csv CATEGORIZE \"open\""
    echo ""
    echo "Environment configurations available:"
    if [ -n "$DEFAULT_REPOS" ]; then
        echo "  DEFAULT_REPOS: $DEFAULT_REPOS"
    fi
    if [ -n "$DEFAULT_AUTHORS" ]; then
        echo "  DEFAULT_AUTHORS: $DEFAULT_AUTHORS"
    fi
    # Show other ENV configs
    env | grep -E "^[A-Z_]+_REPOS=" | sed 's/^/  /'
    env | grep -E "^[A-Z_]+_AUTHORS=" | sed 's/^/  /'
}

# If no arguments provided, check for defaults in .env
if [ $# -eq 0 ]; then
    if [ -z "$DEFAULT_REPOS" ]; then
        echo "❌ No repositories specified and no DEFAULT_REPOS found in .env"
        echo ""
        show_usage
        exit 1
    fi
    echo "🔧 Using environment defaults from .env file"
    REPO_URL="$DEFAULT_REPOS"
    AUTHORS="$DEFAULT_AUTHORS"
    OUTPUT_FILE="output.csv"
    PROMPT_NAME="DEFAULT"
    STATUS_FILTER=""
elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_usage
    exit 0
else
    # Use command-line arguments
    REPO_URL=$1
    AUTHORS=${2:-""}
    OUTPUT_FILE=${3:-"output.csv"}
    PROMPT_NAME=${4:-"DEFAULT"}
    STATUS_FILTER=${5:-""}
fi

echo "🚀 Generating CSV from repositories: $REPO_URL"
if [ -n "$AUTHORS" ]; then
    echo "👥 Filtering by authors: $AUTHORS"
fi
if [ -n "$STATUS_FILTER" ]; then
    echo "� Filtering by status: $STATUS_FILTER"
fi
echo "�📄 Output file: $OUTPUT_FILE"
echo "📝 Using prompt: $PROMPT_NAME"
echo ""

# Run pr-indexer with all parameters
if [ -z "$AUTHORS" ] && [ -z "$STATUS_FILTER" ]; then
    node scripts/pr-indexer.js "$REPO_URL" "$OUTPUT_FILE"
elif [ -z "$STATUS_FILTER" ]; then
    node scripts/pr-indexer.js "$REPO_URL" "$OUTPUT_FILE" "$AUTHORS"
else
    node scripts/pr-indexer.js "$REPO_URL" "$OUTPUT_FILE" "$AUTHORS" "$STATUS_FILTER"
fi

# Check if pr-indexer succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "🔄 Improving CSV descriptions..."
    # Run csv-improve with specified prompt
    node scripts/csv-improve.js "$OUTPUT_FILE" "$PROMPT_NAME"
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Complete! Enhanced CSV saved to: $OUTPUT_FILE"
    else
        echo "❌ Failed to improve CSV"
        exit 1
    fi
else
    echo "❌ Failed to generate CSV"
    exit 1
fi 