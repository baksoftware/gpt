import os
import json

def get_json_cache(cacheId):
    cacheFile = f"query_cache/{cacheId}.json"

    if os.path.exists(cacheFile):
        try:
            with open(cacheFile, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error reading cache file {cacheFile}: {e}")
    return None

def save_json_cache(cacheId, data):
    cacheFile = f"query_cache/{cacheId}.json"

    try:
        with open(cacheFile, 'w') as f:
            json.dump(data, f, indent=4)
    except IOError as e:
        print(f"Error writing cache file {cacheFile}: {e}")

