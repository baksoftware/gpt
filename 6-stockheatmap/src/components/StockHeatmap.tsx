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

interface TreemapDataPoint {
  x: string;
  y: number;
  fillColor?: string;
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

  // Helper function to determine color based on percentage change
  const getColorForPercentChange = (pctChange: number): string => {
    if (pctChange <= -3) return '#FF4560';
    if (pctChange < 0) return '#FF8B9A';
    if (pctChange === 0) return '#B3B3B3';
    if (pctChange < 3) return '#90EE90';
    return '#00E396';
  };

  // Prepare data for the treemap
  const treemapData: TreemapDataPoint[] = stockData.slice(0, 50).map(stock => {
    return {
      x: `${stock.Ticker} (${stock.Pct_Chg.toFixed(2)}%)`,
      y: Math.abs(stock.Weight * 100), // Using weight for size (scaled for visibility)
      fillColor: getColorForPercentChange(stock.Pct_Chg)
    };
  });

  const options: ApexOptions = {
    chart: {
      type: 'treemap',
      toolbar: {
        show: true
      }
    },
    title: {
      text: 'S&P 500 Stock Performance',
      align: 'center'
    },
    tooltip: {
      custom: function({ seriesIndex, dataPointIndex, w }: any) {
        const data = w.config.series[seriesIndex].data[dataPointIndex];
        return `<div class="custom-tooltip">
          <span>${data.x}</span>
        </div>`;
      }
    },
    plotOptions: {
      treemap: {
        distributed: true,
        enableShades: false
      }
    },
    legend: {
      show: true,
      position: 'bottom',
      customLegendItems: [
        'Strong Loss (-3% or worse)', 
        'Loss (0% to -3%)', 
        'Neutral (0%)', 
        'Gain (0% to 3%)', 
        'Strong Gain (3% or better)'
      ],
      markers: {
        fillColors: ['#FF4560', '#FF8B9A', '#B3B3B3', '#90EE90', '#00E396']
      }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
      }
    }
  };

  const series = [{
    data: treemapData
  }];

  return (
    <div className="stock-heatmap">
      <Chart
        options={options}
        series={series}
        type="treemap"
        height={650}
      />
    </div>
  );
};

export default StockHeatmap;