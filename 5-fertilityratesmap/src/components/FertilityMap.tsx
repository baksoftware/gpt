import React, { useState, useEffect } from 'react';
import { 
  ComposableMap, 
  Geographies, 
  Geography,
  ZoomableGroup
} from 'react-simple-maps';
import { scaleQuantize } from 'd3-scale';
import { Tooltip as ReactTooltip } from 'react-tooltip';

interface FertilityData {
  name: string;
  value: number;
  year: string;
}

interface FertilityRatesData {
  metadata: {
    source: string;
    indicator: string;
    date_retrieved: string;
    description: string;
  };
  data: {
    [key: string]: FertilityData;
  };
}

const FertilityMap: React.FC = () => {
  const [data, setData] = useState<FertilityRatesData | null>(null);
  const [tooltipContent, setTooltipContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/fertility_rates.json')
      .then(response => response.json())
      .then(data => {
        setData(data);
        setLoading(false);
        console.log("loading data")
      })
      .catch(error => {
        console.error('Error loading fertility data:', error);
        setLoading(false);
      });
  }, []);

  // Color scale for the map
  const colorScale = scaleQuantize<string>()
    .domain([1, 8])
    .range([
      "#cfe8f3", // Light blue for low fertility rates
      "#a2d4ec",
      "#73bfe2",
      "#46aadb",
      "#1696d2",
      "#12719e",
      "#0a4c6a",
      "#062635"  // Dark blue for high fertility rates
    ]);

  if (loading) {
    return <div>Loading fertility data...</div>;
  }

  return (
    <div className="fertility-map">
      <h2>World Fertility Rates</h2>
      <div className="map-container">
        <ComposableMap
          projectionConfig={{
            rotate: [-10, 0, 0],
            scale: 147
          }}
          width={900}
          height={500}
        >
          <ZoomableGroup>
            <Geographies geography="/world_map.json">
              {({ geographies }) =>
                geographies.map(geo => {
                  const countryCode = geo.id;
                  const countryData = data?.data[countryCode];
                  const hasData = countryData && countryData.value;
                  
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={hasData ? colorScale(countryData.value) : "#F5F4F6"}
                      stroke="#D6D6DA"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", fill: hasData ? "#F53" : "#F5F4F6" },
                        pressed: { outline: "none" }
                      }}
                      onMouseEnter={() => {
                        if (hasData) {
                          setTooltipContent(`${countryData.name}: ${countryData.value} (${countryData.year})`);
                        } else {
                          setTooltipContent(`${geo.properties.name} ${geo.properties.iso2}: No data`);
                        }
                      }}
                      onMouseLeave={() => {
                        setTooltipContent("");
                      }}
                      data-tooltip-id="geo-tooltip"
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
        <ReactTooltip 
          id="geo-tooltip" 
          content={tooltipContent}
          place="top"
        />
      </div>
      <div className="legend">
        <div className="legend-title">Fertility Rate (births per woman)</div>
        <div className="legend-scale">
          {colorScale.range().map((color: string, i: number) => (
            <div 
              key={i} 
              className="legend-item" 
              style={{ 
                backgroundColor: color,
                width: '40px',
                height: '20px',
                display: 'inline-block',
                margin: '0 2px'
              }}
            />
          ))}
        </div>
        <div className="legend-labels">
          <span>1</span>
          <span style={{ marginLeft: 'auto' }}>8</span>
        </div>
      </div>
      <div className="data-source">
        Source: {data?.metadata.source}, {data?.metadata.date_retrieved}
      </div>
    </div>
  );
};

export default FertilityMap; 