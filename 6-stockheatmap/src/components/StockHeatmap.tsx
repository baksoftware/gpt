import React, { useEffect, useState } from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface StockData {
  Rank: number;
  Company: string;
  Ticker: string;
  Weight: number;
  Price: number;
  Chg: number;
  Pct_Chg: number;
}

interface HeatmapDataPoint {
  x: string;
  y: number;
  value: number;
}

const StockHeatmap: React.FC = () => {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/sp500_data.json')
      .then(response => response.json())
      .then((data: StockData[]) => {
        setStockData(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching stock data:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  // Prepare data for the heatmap
  const heatmapData: HeatmapDataPoint[] = stockData.slice(0, 30).map(stock => {
    return {
      x: stock.Ticker,
      y: Math.abs(stock.Weight * 10), // Using weight for size (scaled for visibility)
      value: stock.Pct_Chg // Using percentage change for color
    };
  });

  const options: ApexOptions = {
    chart: {
      type: 'heatmap',
      toolbar: {
        show: false
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function(val: number) {
        return val ? val.toFixed(2) + '%' : '';
      }
    },
    colors: ["#008FFB"],
    title: {
      text: 'S&P 500 Stock Performance'
    },
    tooltip: {
      y: {
        formatter: function(val: number) {
          return val + '%';
        }
      }
    },
    plotOptions: {
      heatmap: {
        colorScale: {
          ranges: [
            {
              from: -10,
              to: 0,
              color: '#FF4560', // Red for negative
              name: 'Loss',
            },
            {
              from: 0,
              to: 10,
              color: '#00E396', // Green for positive
              name: 'Gain',
            }
          ]
        }
      }
    }
  };

  const series = [{
    name: 'Percentage Change',
    data: heatmapData
  }];

  return (
    <div className="stock-heatmap">
      <Chart
        options={options}
        series={series}
        type="heatmap"
        height={550}
      />
    </div>
  );
};

export default StockHeatmap; 