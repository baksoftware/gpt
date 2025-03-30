# Medical Reference Finder

This Python script uses OpenAI's GPT-4o model to find reliable URL references related to a given medical topic, and then validates that each URL actually exists and is accessible.

## Requirements

- Python 3.7+
- OpenAI API key

## Setup

1. Install the required dependencies:

```bash
pip install -r requirements.txt
```

2. Set up your OpenAI API key:

You can either:
- Set the `OPENAI_API_KEY` environment variable:
  ```bash
  export OPENAI_API_KEY="your-api-key-here"
  ```
- Or provide it directly when running the script with the `--api-key` flag.

## Usage

Run the script from the command line, providing a medical topic to search for:

```bash
python medical_reference_finder.py "diabetes treatment guidelines"
```

### Command-line Arguments

- `topic` (required): The medical topic to search for references
- `--num-refs`: Number of references to request (default: 5)
- `--api-key`: Your OpenAI API key (if not set as an environment variable)

### Example

```bash
python medical_reference_finder.py "latest research on Alzheimer's disease" --num-refs 8
```

## Output

The script will:
1. Call GPT-4o to get references about the specified medical topic
2. Validate each URL to check if it exists and is accessible
3. Display the results, showing valid and invalid references

For each reference, the output will show:
- Whether the URL is valid
- The title of the reference
- The URL
- Any error message for invalid URLs

## Notes

- URL validation adds a small delay between requests to be respectful to the servers
- The script includes robust error handling for various HTTP failures
- If a URL doesn't support HEAD requests, the script will fall back to GET requests 