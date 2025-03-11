#!/usr/bin/env python3
"""
Script to scrape S&P 500 data from SlickCharts and save it to a JSON file.
"""

import requests
import pandas as pd
from bs4 import BeautifulSoup
import os
import time
from datetime import datetime
import json

def get_sp500_data():
    """
    Scrape S&P 500 data from SlickCharts website and return as a DataFrame.
    """
    url = "https://www.slickcharts.com/sp500"
    
    # Set a user agent to mimic a browser request
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        # Parse the HTML content
        soup = BeautifulSoup(response.content, 'lxml')
        
        # Find the table containing S&P 500 data
        table = soup.find('table', {'class': 'table table-hover table-borderless table-sm'})
        
        if not table:
            raise ValueError("Could not find the S&P 500 table on the page")
        
        # Extract data from the table
        data = []
        rows = table.find('tbody').find_all('tr')
        
        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 7:
                rank = cols[0].text.strip()
                company = cols[1].text.strip()
                ticker = cols[2].text.strip()
                weight = cols[3].text.strip()
                price = cols[4].text.strip()
                chg = cols[5].text.strip()
                pct_chg = cols[6].text.strip()
                
                # Extract the percentage change value from the format like "(+1.23%)" or "(-1.23%)"
                if pct_chg:
                    pct_chg = pct_chg.strip('()')
                
                data.append({
                    'Rank': rank,
                    'Company': company,
                    'Ticker': ticker,
                    'Weight': weight,
                    'Price': price,
                    'Chg': chg,
                    'Pct_Chg': pct_chg
                })
        
        # Create DataFrame
        df = pd.DataFrame(data)
        
        # Convert numeric columns
        numeric_cols = ['Rank', 'Weight', 'Price', 'Chg']
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col].str.replace('%', '').str.replace(',', ''), errors='coerce')
        
        # Convert percentage change column separately
        df['Pct_Chg'] = pd.to_numeric(df['Pct_Chg'].str.replace('%', ''), errors='coerce')
        
        return df
    
    except Exception as e:
        print(f"Error scraping S&P 500 data: {e}")
        return None

def save_to_json(df, output_dir='../public'):
    """
    Save DataFrame to a JSON file.
    """
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Save the data to the one and only json file
    filename = f"sp500_data.json"
    filepath = os.path.join(output_dir, filename)
    
    # Convert DataFrame to JSON
    json_data = df.to_dict(orient='records')
    
    # Save to JSON file
    with open(filepath, 'w') as f:
        json.dump(json_data, f, indent=2)
    
    print(f"S&P 500 data saved to {filepath}")
    
    return filepath

def main():
    print("Fetching S&P 500 data from SlickCharts...")
    df = get_sp500_data()
    
    if df is not None and not df.empty:
        print(f"Successfully retrieved data for {len(df)} S&P 500 companies")
        
        # Save data to JSON
        save_to_json(df)
    else:
        print("Failed to retrieve S&P 500 data")

if __name__ == "__main__":
    main() 