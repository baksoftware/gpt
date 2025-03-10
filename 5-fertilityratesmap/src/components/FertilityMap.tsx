import React, { useState, useEffect } from 'react';
import { 
  ComposableMap, 
  Geographies, 
  Geography,
  ZoomableGroup,
  Marker
} from 'react-simple-maps';
import { scaleQuantize } from 'd3-scale';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { geoCentroid } from 'd3-geo';

// Updated interface to match the new data structure
interface FertilityData {
  name: string;
  english_name: string;
  alpha2_code: string;
  value: number;
  year: string;
  id?: string;
}

interface FertilityRatesData {
  metadata: {
    source: string;
    indicator: string;
    date_retrieved: string;
    description: string;
  };
  data: {
    [key: string]: FertilityData; // Now key is numeric code
  };
}

const FertilityMap: React.FC = () => {
  const [data, setData] = useState<FertilityRatesData | null>(null);
  const [tooltipContent, setTooltipContent] = useState("");
  const [loading, setLoading] = useState(true);
  // Create a mapping from alpha2 codes to numeric codes for lookup
  const [_alpha2ToNumeric, setAlpha2ToNumeric] = useState<Record<string, string>>({});
  // Add state for map resolution
  const [mapResolution, setMapResolution] = useState<'50m' | '110m'>('50m');
  // Add state for map loading
  const [mapLoading, setMapLoading] = useState(false);
  // Add state for showing country names
  const [showCountryNames, setShowCountryNames] = useState(true);

  useEffect(() => {
    fetch('/fertility_rates.json')
      .then(response => response.json())
      .then((fetchedData: FertilityRatesData) => {
        setData(fetchedData);
        
        // Create a mapping from alpha2 codes to numeric codes
        const mapping: Record<string, string> = {};
        Object.entries(fetchedData.data).forEach(([numericCode, countryData]) => {
          mapping[countryData.alpha2_code] = numericCode;
        });
        setAlpha2ToNumeric(mapping);
        
        setLoading(false);
        console.log("Data loaded successfully");
      })
      .catch(error => {
        console.error('Error loading fertility data:', error);
        setLoading(false);
      });
  }, []);

  // Toggle map resolution
  const toggleMapResolution = () => {
    setMapLoading(true);
    // Short timeout to allow the loading state to be shown
    setTimeout(() => {
      setMapResolution(prev => prev === '50m' ? '110m' : '50m');
      setMapLoading(false);
    }, 300);
  };

  // Toggle country names visibility
  const toggleCountryNames = () => {
    setShowCountryNames(prev => !prev);
  };

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
      <div className="resolution-toggle">
        <button onClick={toggleMapResolution} disabled={mapLoading}>
          {mapLoading ? 'Loading...' : mapResolution === '50m' ? 'Switch to Low Resolution' : 'Switch to High Resolution'}
        </button>
        <div className="resolution-indicator">
          Current: {mapResolution === '50m' ? 'High Resolution (50m)' : 'Low Resolution (110m)'}
        </div>
      </div>
      <div className="country-names-toggle">
        <button onClick={toggleCountryNames}>
          {showCountryNames ? 'Hide Country Names' : 'Show Country Names'}
        </button>
      </div>
      <div className="map-container">
        {mapLoading && (
          <div className="map-loading-overlay">
            <div className="map-loading-spinner">Loading map...</div>
          </div>
        )}
        <ComposableMap
          projectionConfig={{
            rotate: [-10, 0, 0],
            scale: 147
          }}
          width={1000}
          height={600}
          style={{
            width: "100%",
            height: "100%"
          }}
        >
          <ZoomableGroup>
            <Geographies geography={`/world_map_${mapResolution}.json`}>
              {({ geographies }) =>
                geographies.map(geo => {
                  const numericCode = geo.id;
                  const countryData = data?.data[numericCode];
                  const hasData = countryData !== undefined;
                  const centroid = geoCentroid(geo);
                  // Remove any text in parentheses from the country name
                  const rawCountryName = hasData ? countryData.english_name : geo.properties.name;
                  const countryName = rawCountryName.replace(/\s*\([^)]*\)\s*/g, '');
                  
                  return (
                    <React.Fragment key={geo.rsmKey}>
                      <Geography
                        geography={geo}
                        fill={hasData ? colorScale(countryData.value) : "#F5F4F6"}
                        stroke="#D6D6DA"
                        strokeWidth={0.1}
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none", fill: hasData ? "#F53" : "#F5F4F6" },
                          pressed: { outline: "none" }
                        }}
                        onMouseEnter={() => {
                          if (hasData) {
                            setTooltipContent(
                              `${countryData.english_name} (${countryData.alpha2_code})\n${countryData.value} (${countryData.year})`
                            );
                          } else {
                            setTooltipContent(`${geo.properties.name} ${geo.properties.iso2 || ''}\nNo data`);
                          }
                        }}
                        onMouseLeave={() => {
                          setTooltipContent("");
                        }}
                        data-tooltip-id="geo-tooltip"
                      />
                      {showCountryNames && centroid[0] && centroid[1] && (
                        <Marker coordinates={centroid}>
                          <text
                            textAnchor="middle"
                            style={{
                              fontFamily: "Arial",
                              fontSize: mapResolution === '50m' ? "4px" : "6px",
                              fontWeight: "bold",
                              fill: "#000",
                              pointerEvents: "none"
                            }}
                          >
                            {countryName}
                          </text>
                        </Marker>
                      )}
                    </React.Fragment>
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
          style={{
            whiteSpace: 'pre-line',
            lineHeight: '1.5',
            padding: '8px 12px'
          }}
        />
         
        <div className="legend">
          <div className="legend-title">Fertility Rate (births per woman)</div>
          <div className="legend-scale">
            {colorScale.range().map((color: string, i: number) => (
              <div 
                key={i} 
                className="legend-item" 
                style={{ 
                  backgroundColor: color,
                  width: '20px',
                  height: '15px',
                  display: 'inline-block',
                  margin: '0 1px'
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
    </div>
  );
};

export default FertilityMap; 