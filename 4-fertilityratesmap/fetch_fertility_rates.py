#!/usr/bin/env python3
import requests
import json
import time
from datetime import datetime

def fetch_fertility_rates():
    """
    Fetches fertility rates for all countries from the World Bank API.
    Returns a dictionary with country codes as keys and fertility rate data as values.
    """
    print("Fetching fertility rate data from World Bank API...")
    
    # World Bank API endpoint for fertility rate (total births per woman)
    # Indicator SP.DYN.TFRT.IN is the Total Fertility Rate
    url = "http://api.worldbank.org/v2/country/all/indicator/SP.DYN.TFRT.IN?format=json&per_page=300&mrnev=1"
    
    response = requests.get(url)
    if response.status_code != 200:
        print(f"Error fetching data: {response.status_code}")
        return None
    
    data = response.json()
    
    # The first element contains metadata, the second contains the actual data
    if len(data) < 2:
        print("Unexpected API response format")
        return None
    
    country_data = {}
    
    for entry in data[1]:
        if entry.get('value') is not None:
            country_code = entry.get('country', {}).get('id')
            country_name = entry.get('country', {}).get('value')
            fertility_rate = entry.get('value')
            year = entry.get('date')
            
            country_data[country_code] = {
                'name': country_name,
                'fertility_rate': fertility_rate,
                'year': year
            }
    
    return country_data

def save_to_json(data, filename="fertility_rates.json"):
    """
    Saves the fertility rate data to a JSON file.
    """
    with open(filename, 'w', encoding='utf-8') as f:
        # Add metadata to the output
        output = {
            "metadata": {
                "source": "World Bank",
                "indicator": "SP.DYN.TFRT.IN (Total Fertility Rate)",
                "date_retrieved": datetime.now().strftime("%Y-%m-%d"),
                "description": "Total fertility rate represents the number of children that would be born to a woman if she were to live to the end of her childbearing years and bear children in accordance with age-specific fertility rates of the specified year."
            },
            "data": data
        }
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"Data saved to {filename}")
    print(f"Retrieved fertility rates for {len(data)} countries")

def main():
    try:
        fertility_data = fetch_fertility_rates()
        if fertility_data:
            save_to_json(fertility_data)
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main() 