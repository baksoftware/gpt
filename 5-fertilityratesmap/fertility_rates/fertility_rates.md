# Fertility rates map



```
curl --output fertrates.json "https://api.worldbank.org/v2/country/all/indicator/SP.DYN.TFRT.IN?format=json&mrnev=1"
```


This script fetches the latest available fertility rate data for all countries from the World Bank API and saves it to a JSON file.

## Requirements

- Python 3.6 or higher
- Internet connection

## Installation

1. Clone this repository or download the files
2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

## Usage

Run the script with:

```bash
python fetch_fertility_rates.py
```

This will:
1. Fetch the most recent fertility rate data from the World Bank API
2. Process the data to extract country names, fertility rates, and the year of measurement
3. Save the data to a file named `fertility_rates.json` in the current directory

## Output Format

The output JSON file contains:
- Metadata about the source and date of retrieval
- Data for each country with:
  - Country name
  - Fertility rate (average number of children born per woman)
  - Year of the data point

## Data Source

The data is sourced from the World Bank's World Development Indicators, specifically the "Total Fertility Rate" indicator (SP.DYN.TFRT.IN).

## License

This project is open source and available under the MIT License. 