#!/usr/bin/env python3
"""
S&P 500 Stock Data Fetcher

This script fetches current price data for S&P 500 stocks, including daily percentage gains.
"""

import pandas as pd
import yfinance as yf
import datetime
import time
import os

def get_sp500_tickers():
    """
    Get a list of S&P 500 tickers using pandas_datareader
    """
    try:
        # Get S&P 500 tickers from Wikipedia
        sp500_url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
        sp500_table = pd.read_html(sp500_url)
        sp500_tickers = sp500_table[0]['Symbol'].tolist()
        
        # Clean tickers (replace dots with hyphens as required by Yahoo Finance)
        sp500_tickers = [ticker.replace('.', '-') for ticker in sp500_tickers]
        
        return sp500_tickers
    except Exception as e:
        print(f"Error fetching S&P 500 tickers: {e}")
        return []

def get_stock_data(tickers, batch_size=100):
    """
    Fetch current stock data for the given tickers, including daily percentage gains
    
    Args:
        tickers (list): List of stock tickers
        batch_size (int): Number of tickers to process in each batch
    
    Returns:
        pandas.DataFrame: DataFrame with stock data
    """
    all_data = []
    
    # Process tickers in batches to avoid rate limiting
    for i in range(0, len(tickers), batch_size):
        batch = tickers[i:i+batch_size]
        print(f"Fetching data for batch {i//batch_size + 1}/{(len(tickers) + batch_size - 1)//batch_size}...")
        
        try:
            # Get data for the current batch
            data = yf.download(
                tickers=batch,
                period="2d",  # Get 2 days of data to calculate daily change
                group_by="ticker",
                auto_adjust=True,
                prepost=False,
                threads=True
            )
            
            # Process each ticker in the batch
            for ticker in batch:
                try:
                    if len(batch) == 1:
                        ticker_data = data
                    else:
                        ticker_data = data[ticker]
                    
                    if ticker_data.empty:
                        continue
                    
                    # Calculate daily percentage change
                    current_price = ticker_data['Close'].iloc[-1]
                    prev_price = ticker_data['Close'].iloc[-2]
                    daily_change_pct = ((current_price - prev_price) / prev_price) * 100
                    
                    # Get other relevant data
                    volume = ticker_data['Volume'].iloc[-1]
                    
                    all_data.append({
                        'Ticker': ticker,
                        'Price': current_price,
                        'Change_Pct': daily_change_pct,
                        'Volume': volume
                    })
                except Exception as e:
                    print(f"Error processing ticker {ticker}: {e}")
            
            # Add a small delay to avoid hitting rate limits
            time.sleep(1)
            
        except Exception as e:
            print(f"Error fetching batch data: {e}")
    
    # Create DataFrame from all collected data
    if all_data:
        result_df = pd.DataFrame(all_data)
        return result_df.sort_values('Change_Pct', ascending=False)
    else:
        return pd.DataFrame()

def main():
    print("Fetching S&P 500 tickers...")
    tickers = get_sp500_tickers()
    
    if not tickers:
        print("Failed to retrieve S&P 500 tickers. Exiting.")
        return
    
    print(f"Retrieved {len(tickers)} S&P 500 tickers.")
    
    print("Fetching current stock data...")
    stock_data = get_stock_data(tickers)
    
    if stock_data.empty:
        print("Failed to retrieve stock data. Exiting.")
        return
    
    # Format the DataFrame for display
    pd.set_option('display.max_rows', None)
    pd.set_option('display.float_format', '{:.2f}'.format)
    
    # Add timestamp
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\nS&P 500 Stock Data (as of {timestamp}):")
    
    # Display the data
    print("\nTop Gainers:")
    print(stock_data.head(10)[['Ticker', 'Price', 'Change_Pct']])
    
    print("\nTop Losers:")
    print(stock_data.tail(10)[['Ticker', 'Price', 'Change_Pct']])
    
    # Save to CSV
    csv_filename = f"sp500_stock_data_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    stock_data.to_csv(csv_filename, index=False)
    print(f"\nComplete data saved to {csv_filename}")

if __name__ == "__main__":
    main() 