#!/usr/bin/env python3
"""
Medical Reference Finder

This script uses OpenAI's web search API to find URL references related to a medical topic,
and then validates that each URL actually exists.
"""

import argparse
import json
import requests
import sys
import time
from typing import List, Dict, Any
from urllib.parse import urlparse
import openai

# Default number of references to request
DEFAULT_NUM_REFERENCES = 5

def setup_argparse() -> argparse.Namespace:
    """Set up and parse command line arguments."""
    parser = argparse.ArgumentParser(description="Find medical references using OpenAI's web search API.")
    parser.add_argument("topic", help="Medical topic to search for references")
    parser.add_argument(
        "--num-refs", 
        type=int, 
        default=DEFAULT_NUM_REFERENCES,
        help=f"Number of references to request (default: {DEFAULT_NUM_REFERENCES})"
    )
    parser.add_argument(
        "--api-key", 
        help="OpenAI API key (if not provided, will try to use OPENAI_API_KEY environment variable)"
    )
    
    return parser.parse_args()

def get_openai_client(api_key: str = None) -> openai.OpenAI:
    """Initialize and return an OpenAI client with the provided or environment API key."""
    try:
        client = openai.OpenAI(api_key=api_key)
        return client
    except Exception as e:
        print(f"Error initializing OpenAI client: {e}")
        print("Make sure you have set OPENAI_API_KEY environment variable or provided --api-key")
        sys.exit(1)

def get_references(client: openai.OpenAI, topic: str, num_refs: int) -> List[Dict[str, str]]:
    """
    Use OpenAI's web search API to get references about the medical topic.
    
    Returns a list of dictionaries with title and url keys.
    """
    system_prompt = """
    You are a helpful medical research assistant. Your task is to provide reliable references 
    related to the medical topic provided. For each reference:
    
    1. Include only references from reputable medical sources
    2. Provide the exact URL where the information can be found
    3. Include a brief title or description of the reference
    
    Format your response as a JSON array with objects containing 'title' and 'url' keys.
    Example:
    [
        {"title": "CDC Guidelines on Diabetes Management", "url": "https://www.cdc.gov/diabetes/managing/index.html"},
        ...
    ]
    
    Provide exactly the number of references requested. Do not include any explanation outside of the JSON structure.
    """
    
    user_prompt = f"Find {num_refs} reliable medical references (with exact URLs) about: {topic}"
    
    try:
        # First, use the search API to get relevant URLs
        search_response = client.chat.completions.create(
            model="gpt-4o-mini-search-preview",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            tools=[{
                "type": "function",
                "function": {
                    "name": "search_web",
                    "description": "Search the web for medical information",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query"
                            },
                            "num_results": {
                                "type": "integer",
                                "description": "Number of results to return"
                            }
                        },
                        "required": ["query", "num_results"]
                    }
                }
            }],
            tool_choice={"type": "function", "function": {"name": "search_web"}},
            response_format={"type": "json_object"}
        )
        
        # Extract the search query from the response
        search_query = json.loads(search_response.choices[0].message.tool_calls[0].function.arguments)["query"]
        
        # Now perform the actual web search
        search_results = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful assistant that formats search results into a structured JSON format."},
                {"role": "user", "content": f"Search for: {search_query}"}
            ],
            tools=[{
                "type": "function",
                "function": {
                    "name": "search_web",
                    "description": "Search the web for medical information",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The search query"
                            },
                            "num_results": {
                                "type": "integer",
                                "description": "Number of results to return"
                            }
                        },
                        "required": ["query", "num_results"]
                    }
                }
            }],
            tool_choice={"type": "function", "function": {"name": "search_web"}},
            response_format={"type": "json_object"}
        )
        
        # Parse the search results
        results = json.loads(search_results.choices[0].message.tool_calls[0].function.arguments)
        
        # Format the results into our expected structure
        references = []
        for result in results.get("results", [])[:num_refs]:
            references.append({
                "title": result.get("title", "Untitled"),
                "url": result.get("url", "")
            })
            
        return references
    
    except Exception as e:
        print(f"Error using OpenAI's web search API: {e}")
        sys.exit(1)

def validate_urls(references: List[Dict[str, str]]) -> List[Dict[str, Any]]:
    """
    Validate each URL to check if it exists and is accessible.
    
    Returns the original references with added validation information.
    """
    validated_refs = []
    
    for i, ref in enumerate(references, 1):
        title = ref.get("title", "Untitled")
        url = ref.get("url", "").strip()
        
        print(f"[{i}/{len(references)}] Validating: {url}")
        
        result = {
            "title": title,
            "url": url,
            "valid": False,
            "status_code": None,
            "error": None
        }
        
        # Skip if no URL or malformed URL
        if not url:
            result["error"] = "Missing URL"
            validated_refs.append(result)
            continue
            
        # Check if URL has a valid format
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                result["error"] = "Invalid URL format"
                validated_refs.append(result)
                continue
        except Exception as e:
            result["error"] = f"URL parsing error: {str(e)}"
            validated_refs.append(result)
            continue
        
        # Try to access the URL
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
            }
            response = requests.head(url, timeout=10, headers=headers, allow_redirects=True)
            
            # If HEAD request fails, try GET (some servers don't support HEAD)
            if response.status_code >= 400:
                response = requests.get(
                    url, timeout=10, headers=headers, 
                    allow_redirects=True, stream=True
                )
                # Close connection immediately after checking status
                response.close()
                
            result["status_code"] = response.status_code
            if 200 <= response.status_code < 400:
                result["valid"] = True
            else:
                result["error"] = f"HTTP error: {response.status_code}"
                
        except requests.exceptions.Timeout:
            result["error"] = "Request timed out"
        except requests.exceptions.TooManyRedirects:
            result["error"] = "Too many redirects"
        except requests.exceptions.SSLError:
            result["error"] = "SSL certificate error"
        except requests.exceptions.ConnectionError:
            result["error"] = "Connection error"
        except Exception as e:
            result["error"] = f"Request failed: {str(e)}"
            
        validated_refs.append(result)
        
        # Add a small delay to be nice to servers
        time.sleep(1)
        
    return validated_refs

def display_results(topic: str, validated_refs: List[Dict[str, Any]]) -> None:
    """Display the validation results in a readable format."""
    valid_count = sum(1 for ref in validated_refs if ref["valid"])
    
    print("\n" + "=" * 80)
    print(f"MEDICAL REFERENCE RESULTS FOR: {topic}")
    print("=" * 80)
    print(f"Found {len(validated_refs)} references. {valid_count} are valid.")
    print("-" * 80)
    
    for i, ref in enumerate(validated_refs, 1):
        status = "✅ VALID" if ref["valid"] else "❌ INVALID"
        print(f"{i}. {status} - {ref['title']}")
        print(f"   URL: {ref['url']}")
        
        if not ref["valid"]:
            error = ref["error"] or f"Status code: {ref['status_code']}"
            print(f"   Error: {error}")
            
        print()
        
    print("=" * 80)

def main():
    """Main function to orchestrate the reference finding and validation process."""
    args = setup_argparse()
    
    print(f"Searching for references about: {args.topic}")
    print(f"Requesting {args.num_refs} references...\n")
    
    # Initialize OpenAI client
    client = get_openai_client(args.api_key)
    
    # Get references from OpenAI's web search API
    references = get_references(client, args.topic, args.num_refs)
    
    if not references:
        print("No references found. Please try a different topic or increase the number of references.")
        sys.exit(1)
        
    print(f"Found {len(references)} references. Validating URLs...\n")
    
    # Validate the URLs
    validated_refs = validate_urls(references)
    
    # Display the results
    display_results(args.topic, validated_refs)

if __name__ == "__main__":
    main() 