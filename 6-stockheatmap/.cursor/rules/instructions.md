# React TypeScript Project Best Practices

## Project Setup
1. Create a new React TypeScript project with Vite and SWC for faster development:
   ```bash
   npm create vite@latest my-stock-heatmap -- --template react-swc-ts
   ```

2. Install essential dependencies:
   ```bash
   npm install react-apexcharts apexcharts axios typescript @types/react @types/react-dom
   ```

3. Set up a proper folder structure:
   ```
   src/
   ├── components/     # Reusable UI components
   ├── hooks/          # Custom React hooks
   ├── services/       # API calls and external services
   ├── types/          # TypeScript type definitions
   ├── utils/          # Helper functions
   ├── pages/          # Page components
   ├── context/        # React context providers
   ├── assets/         # Static assets
   └── App.tsx         # Main application component
   ```

## TypeScript Best Practices
1. Use explicit typing instead of `any` whenever possible
2. Create dedicated type files for complex data structures
3. Use interfaces for object shapes and types for unions/primitives
4. Leverage TypeScript's utility types (Pick, Omit, Partial, etc.)
5. Enable strict mode in tsconfig.json

## Stock Heatmap Implementation
1. Use ApexCharts' Treemap with color range for visualizing stock performance:
   - Install from: https://www.apexcharts.com/react-chart-demos/treemap-charts/color-range/
   - Use treemap chart type with color ranges based on percentage change

2. Create a StockHeatmap component:
   ```tsx
   import React from 'react';
   import ReactApexChart from 'react-apexcharts';
   import { ApexOptions } from 'apexcharts';

   interface StockData {
     symbol: string;
     name: string;
     percentChange: number;
     marketCap: number;
   }

   interface StockHeatmapProps {
     data: StockData[];
   }

   const StockHeatmap: React.FC<StockHeatmapProps> = ({ data }) => {
     // Transform stock data for treemap format
     const seriesData = data.map(stock => ({
       x: stock.symbol,
       y: Math.abs(stock.marketCap),
       fillColor: getColorBasedOnPercentChange(stock.percentChange),
       percentChange: stock.percentChange
     }));

     const options: ApexOptions = {
       legend: {
         show: false
       },
       chart: {
         type: 'treemap',
         toolbar: {
           show: false
         }
       },
       title: {
         text: 'Stock Market Heatmap',
         align: 'center'
       },
       dataLabels: {
         enabled: true,
         formatter: function(text, op) {
           return text + ': ' + op.dataPointIndex.percentChange.toFixed(2) + '%';
         }
       },
       tooltip: {
         y: {
           formatter: function(value, { series, seriesIndex, dataPointIndex }) {
             return data[dataPointIndex].name + ': ' + data[dataPointIndex].percentChange.toFixed(2) + '%';
           }
         }
       },
       colors: [
         '#CD363A', // deep red (very negative)
         '#F2726F', // light red (negative)
         '#FFC75F', // yellow (neutral)
         '#8CCF4D', // light green (positive)
         '#37A76F'  // deep green (very positive)
       ],
       plotOptions: {
         treemap: {
           distributed: true,
           enableShades: false
         }
       }
     };

     const series = [{
       data: seriesData
     }];

     return (
       <div id="chart">
         <ReactApexChart 
           options={options} 
           series={series} 
           type="treemap" 
           height={650} 
         />
       </div>
     );
   };

   // Helper function to determine color based on percent change
   function getColorBasedOnPercentChange(percentChange: number): string {
     if (percentChange <= -3) return '#CD363A';
     if (percentChange < 0) return '#F2726F';
     if (percentChange < 1) return '#FFC75F';
     if (percentChange < 3) return '#8CCF4D';
     return '#37A76F';
   }

   export default StockHeatmap;
   ```

3. Create a service to fetch stock data:
   ```tsx
   // src/services/stockService.ts
   import axios from 'axios';
   import { StockData } from '../types/stock';

   export async function fetchStockData(): Promise<StockData[]> {
     // Replace with your actual API endpoint
     const response = await axios.get('your-stock-api-endpoint');
     return response.data;
   }
   ```

## State Management
1. For simple projects, use React Context API and hooks
2. For complex state, consider Redux Toolkit or Zustand
3. Use React Query for server state management

## Performance Optimization
1. Memoize expensive calculations with useMemo
2. Prevent unnecessary re-renders with React.memo and useCallback
3. Use virtualization for long lists (react-window or react-virtualized)
4. Implement code-splitting with React.lazy and Suspense

## Testing
1. Use Jest and React Testing Library for unit and integration tests
2. Write tests for critical business logic and UI components
3. Implement E2E tests with Cypress for critical user flows

## Deployment
1. Set up CI/CD pipeline with GitHub Actions or similar
2. Use environment variables for configuration
3. Optimize bundle size with code splitting and tree shaking
4. Consider using Vercel, Netlify, or AWS Amplify for hosting

## Code Quality
1. Use ESLint with typescript-eslint plugin
2. Set up Prettier for consistent code formatting
3. Implement pre-commit hooks with husky and lint-staged
4. Follow a consistent naming convention
