#!/usr/bin/env python3
import json
import csv
import os

def main():
    # Load the CSV file
    country_data_map = {}
    with open('fertility_rates/isomap.csv', 'r', encoding='utf-8') as f:
        csv_reader = csv.reader(f, delimiter=';')
        next(csv_reader)  # Skip header row
        for row in csv_reader:
            if len(row) >= 5:  # Ensure we have enough columns (EnglishName, FrenchName, Alpha-2, Alpha-3, Numeric)
                english_name = row[0]
                iso2_code = row[2]  # Alpha-2 code
                numeric_code = row[4]  # Numeric code
                if iso2_code and numeric_code:  # Only add if both codes are not empty
                    country_data_map[iso2_code] = {
                        "numeric_code": numeric_code,
                        "english_name": english_name
                    }
    
    # Load the fertility rates JSON
    with open('fertility_rates/fertility_rates.json', 'r', encoding='utf-8') as f:
        fertility_data = json.load(f)
    
    # Print some stats
    print(f"Loaded {len(country_data_map)} country codes from isomap.csv")
    print(f"Loaded {len(fertility_data['data'])} countries from fertility_rates.json")
    
    # Create a new data structure with numeric codes as keys
    new_data = {}
    matched_count = 0
    not_found_count = 0
    
    print("\nEntries that couldn't be found in the CSV data:")
    for iso2_code, country_data in fertility_data["data"].items():
        if iso2_code in country_data_map:
            numeric_code = country_data_map[iso2_code]["numeric_code"]
            english_name = country_data_map[iso2_code]["english_name"]
            
            # Create new entry with numeric code as key
            new_data[numeric_code] = {
                "name": country_data["name"],  # Keep original name
                "english_name": english_name,  # Add English name from CSV
                "alpha2_code": iso2_code,      # Add alpha-2 code
                "value": country_data["value"],
                "year": country_data["year"]
            }
            
            # Add ID if it exists in the original data
            if "id" in country_data:
                new_data[numeric_code]["id"] = country_data["id"]
                
            matched_count += 1
        else:
            # Print out entries that couldn't be found
            print(f"  - Code: {iso2_code}, Name: {country_data['name']}")
            not_found_count += 1
    
    # Replace the data in fertility_data
    fertility_data["data"] = new_data
    
    print(f"\nMatched and transformed: {matched_count} countries")
    print(f"Not found and removed: {not_found_count} countries")
    print(f"Total in output: {len(new_data)} countries")
    
    # Save the updated fertility_rates.json
    output_path = 'public/fertility_rates.json'
    os.makedirs(os.path.dirname(output_path), exist_ok=True)  # Ensure directory exists
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(fertility_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nUpdated data saved to {output_path}")

if __name__ == "__main__":
    main()