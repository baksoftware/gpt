import React from 'react';
import { extend } from '@pixi/react';
import * as PIXI from 'pixi.js';
import { Container, Graphics, Text as PixiText } from 'pixi.js';

// Extend @pixi/react with the PixiJS components we want to use
extend({ Container, Graphics, Text: PixiText });

// Constants (copied from Visualization.tsx for now)
const CHART_PADDING = 20;
const CHART_AXIS_COLOR = 0x333333;
const CHART_LINE_COLOR = 0x606060;
const CHART_BG_COLOR = 0xf8f8f8;
const CHART_RATE_LINE_COLOR = 0xffa500;

const RATE_CALCULATION_WINDOW = 5;
const RATE_SCALING_FACTOR = 4;
interface PerformanceGraphProps {
  doneTasksHistory: number[];
  doneTasksRateHistory: number[];
  chartHeight: number;
  stageWidth: number;
  chartTicks: number;
  maxYForChart: number;
}

const PerformanceGraph: React.FC<PerformanceGraphProps> = ({
  doneTasksHistory, 
  chartHeight,
  stageWidth,
  chartTicks,
  maxYForChart,
}) => {
  return (
    <pixiContainer x={0} y={0}>
      <pixiGraphics
        draw={(g: PIXI.Graphics) => {
          g.clear();
          // Chart Background
          g.rect(0, 0, stageWidth, chartHeight);
          g.fill(CHART_BG_COLOR);

          // Chart Axes
          g.setStrokeStyle({ width: 1, color: CHART_AXIS_COLOR });
          g.moveTo(CHART_PADDING, CHART_PADDING);
          g.lineTo(CHART_PADDING, chartHeight - CHART_PADDING);
          g.moveTo(CHART_PADDING, chartHeight - CHART_PADDING);
          g.lineTo(stageWidth - CHART_PADDING, chartHeight - CHART_PADDING);
          g.stroke(); // Stroke the axes

          // Plotting the lines for done tasks history and rate
          if (doneTasksHistory.length > 1) {
            // Define chart plotting dimensions once for both lines
            const chartPlotWidth = stageWidth - 2 * CHART_PADDING;
            const chartPlotHeight = chartHeight - 2 * CHART_PADDING;
            const firstX = CHART_PADDING;

            // 1. Plotting total done tasks
            g.setStrokeStyle({ width: 2, color: CHART_LINE_COLOR });
            const firstValue = doneTasksHistory[0];
            const firstY = (chartHeight - CHART_PADDING) - (firstValue / maxYForChart) * chartPlotHeight;

            g.moveTo(firstX, Math.max(CHART_PADDING, Math.min(firstY, chartHeight - CHART_PADDING)));
            for (let i = 1; i < doneTasksHistory.length; i++) {
              const value = doneTasksHistory[i];
              const x = CHART_PADDING + (i / (chartTicks - 1)) * chartPlotWidth;
              const y = (chartHeight - CHART_PADDING) - (value / maxYForChart) * chartPlotHeight;
              const clampedY = Math.max(CHART_PADDING, Math.min(y, chartHeight - CHART_PADDING));
              g.lineTo(x, clampedY);
            }
            g.stroke(); 


            g.moveTo(firstX, Math.max(CHART_PADDING, Math.min(firstY, chartHeight - CHART_PADDING)));
            g.setStrokeStyle({ width: 2, color: CHART_RATE_LINE_COLOR });
            for (let i = 1; i < doneTasksHistory.length; i++) {
              const value = RATE_SCALING_FACTOR * ( doneTasksHistory[i]-doneTasksHistory[Math.max(0,i-RATE_CALCULATION_WINDOW)]);
              const x = CHART_PADDING + (i / (chartTicks - 1)) * chartPlotWidth;
              const y = (chartHeight - CHART_PADDING) - (value / maxYForChart) * chartPlotHeight;
              const clampedY = Math.max(CHART_PADDING, Math.min(y, chartHeight - CHART_PADDING));
              g.lineTo(x, clampedY);
            }
            g.stroke(); 
          }
        }}
      />
      {/* X-Axis Labels */}
      <pixiText
        text="0"
        x={CHART_PADDING}
        y={chartHeight - CHART_PADDING + 5}
        style={new PIXI.TextStyle({ fontSize: 10, fill: CHART_AXIS_COLOR })}
        anchor={{ x: 0.5, y: 0 }}
      />
      <pixiText
        text={chartTicks.toString()}
        x={stageWidth - CHART_PADDING}
        y={chartHeight - CHART_PADDING + 5}
        style={new PIXI.TextStyle({ fontSize: 10, fill: CHART_AXIS_COLOR })}
        anchor={{ x: 0.5, y: 0 }}
      />
      <pixiText
        text="Ticks"
        x={stageWidth / 2}
        y={chartHeight - CHART_PADDING + 15}
        style={new PIXI.TextStyle({ fontSize: 12, fill: CHART_AXIS_COLOR, fontWeight: 'bold' })}
        anchor={0.5}
      />
      {/* Y-Axis Labels */}
      <pixiText
        text="0"
        x={CHART_PADDING - 5}
        y={chartHeight - CHART_PADDING}
        style={new PIXI.TextStyle({ fontSize: 10, fill: CHART_AXIS_COLOR })}
        anchor={{ x: 1, y: 0.5 }}
      />
      <pixiText
        text={maxYForChart.toString()}
        x={CHART_PADDING - 5}
        y={CHART_PADDING}
        style={new PIXI.TextStyle({ fontSize: 10, fill: CHART_AXIS_COLOR })}
        anchor={{ x: 1, y: 0.5 }}
      />
      <pixiText
        text="Done Tasks"
        x={CHART_PADDING - 15}
        y={chartHeight / 2}
        style={new PIXI.TextStyle({ fontSize: 12, fill: CHART_AXIS_COLOR, fontWeight: 'bold' })}
        anchor={0.5}
        rotation={-Math.PI / 2}
      />
    </pixiContainer>
  );
};

export default PerformanceGraph; 