# S&P 500 Stock Data Fetcher

This Python script fetches current price data for all S&P 500 stocks, including their daily percentage gains.
pip
## Features

- Retrieves the current list of S&P 500 companies from Wikipedia
- Fetches current stock prices and calculates daily percentage changes
- Displays top gainers and losers
- Saves complete data to a CSV file with timestamp
- Handles API rate limiting with batch processing

## Requirements

- Python 3.6 or higher
- Required packages (see requirements.txt):
  - pandas
  - yfinance
  - lxml
  - requests

## Installation

1. Clone this repository or download the script files
2. Install the required packages:

```bash
pip install -r requirements.txt
```

## Usage

Run the script from the command line:

```bash
python sp500_stock_data.py
```

The script will:
1. Fetch the current list of S&P 500 companies
2. Download stock data for each company
3. Calculate daily percentage changes
4. Display the top 10 gainers and losers
5. Save all data to a CSV file in the current directory

## Output

The script outputs:
- A list of top 10 gainers (stocks with highest daily percentage increase)
- A list of top 10 losers (stocks with lowest daily percentage change)
- A CSV file with all S&P 500 stocks and their data, sorted by percentage change

Example CSV filename: `sp500_stock_data_20230615_120530.csv`

## Notes

- The script uses Yahoo Finance (yfinance) as the data source
- Stock data is fetched in batches to avoid API rate limits
- The script handles common errors and exceptions gracefully 