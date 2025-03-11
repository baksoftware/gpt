# S&P 500 Data Scraper

This script scrapes S&P 500 data from [SlickCharts](https://www.slickcharts.com/sp500) and saves it to a CSV file.

## Requirements

Install the required packages:

```bash
pip install -r requirements.txt
```

## Usage

Run the script:

```bash
python get_sp500_data.py
```

The script will:
1. Fetch the current S&P 500 data from SlickCharts
2. Parse the HTML to extract company information
3. Save the data to a CSV file in the `data` directory with a timestamp in the filename

## Output

The CSV file contains the following columns:
- Rank: Position in the S&P 500 index
- Company: Company name
- Ticker: Stock ticker symbol
- Weight: Weight in the S&P 500 index (%)
- Price: Current stock price
- Chg: Price change
- Pct_Chg: Percentage price change

## Notes

- The script uses a user agent to mimic a browser request to avoid being blocked
- If the website structure changes, the script may need to be updated 