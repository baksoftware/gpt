# S&P 500 Data Scraper and Heatmap Visualizer

This project scrapes S&P 500 data from [SlickCharts](https://www.slickcharts.com/sp500) and creates a heatmap visualization.

## Requirements

Install the required packages:

```bash
pip install -r requirements.txt
```

## Usage

### 1. Fetch S&P 500 Data

Run the data scraper script:

```bash
python get_sp500_data.py
```

The script will:
1. Fetch the current S&P 500 data from SlickCharts
2. Parse the HTML to extract company information
3. Save the data to a CSV file in the `data` directory

### 2. Create Heatmap Visualization

After fetching the data, run the heatmap script:

```bash
python create_heatmap.py
```

This will:
1. Load the S&P 500 data from the CSV file
2. Create a treemap visualization where:
   - The size of each rectangle is proportional to the stock's weight in the index (market cap)
   - The color is on a red/green scale based on the daily gain/loss percentage
3. Save the heatmap as a PNG image in the `data` directory

## Output Files

- `data/sp500_data.csv`: CSV file containing S&P 500 data
- `data/sp500_heatmap.png`: Heatmap visualization of S&P 500 stocks

## Data Columns

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
- The heatmap visualization filters out stocks with very small weights to improve readability 