#!/usr/bin/env python3
"""
Script to create a heatmap visualization of S&P 500 stocks.
- Size of each rectangle is proportional to the stock's weight in the index (market cap)
- Color is on a red/green scale based on the daily gain/loss
"""

import os
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import squarify
import seaborn as sns
import numpy as np

def load_sp500_data(filepath='data/sp500_data.csv'):
    """
    Load S&P 500 data from CSV file.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"S&P 500 data file not found: {filepath}")
    
    df = pd.read_csv(filepath)
    return df

def create_heatmap(df, output_dir='data', min_weight=0.05):
    """
    Create a heatmap visualization of S&P 500 stocks.
    
    Parameters:
    - df: DataFrame containing S&P 500 data
    - output_dir: Directory to save the output image
    - min_weight: Minimum weight threshold for including stocks in the visualization
    """
    # Filter out stocks with very small weights to make the visualization clearer
    # Keep the top stocks that make up most of the index
    df_filtered = df[df['Weight'] >= min_weight].copy()
    
    # Sort by weight (descending)
    df_filtered = df_filtered.sort_values('Weight', ascending=False)
    
    # Create a custom colormap for the percentage change
    # Red for negative, white for zero, green for positive
    cmap = mcolors.LinearSegmentedColormap.from_list("RedWhiteGreen", 
                                                    [(0.8, 0, 0),    # Dark red
                                                     (1, 0.5, 0.5),  # Light red
                                                     (1, 1, 1),      # White
                                                     (0.5, 1, 0.5),  # Light green
                                                     (0, 0.8, 0)],   # Dark green
                                                    N=100)
    
    # Normalize the percentage change for color mapping
    # Find the maximum absolute percentage change for symmetric color scaling
    max_abs_pct = max(abs(df_filtered['Pct_Chg'].min()), abs(df_filtered['Pct_Chg'].max()))
    norm = mcolors.Normalize(vmin=-max_abs_pct, vmax=max_abs_pct)
    
    # Create the figure and axis
    fig, ax = plt.subplots(figsize=(16, 10))
    
    # Create the treemap
    squarify.plot(sizes=df_filtered['Weight'],
                 label=[f"{ticker}\n{weight:.1f}%" for ticker, weight in zip(df_filtered['Ticker'], df_filtered['Weight'])],
                 color=[cmap(norm(pct)) for pct in df_filtered['Pct_Chg']],
                 alpha=0.8,
                 pad=True,
                 text_kwargs={'fontsize': 10, 'fontweight': 'bold'},
                 ax=ax)
    
    # Remove axis
    ax.axis('off')
    
    # Add title and date information
    ax.set_title('S&P 500 Stocks Heatmap', fontsize=18, fontweight='bold', pad=20)
    fig.suptitle(f'Size: Market Cap Weight | Color: Daily % Change', fontsize=12, y=0.92)
    
    # Add a colorbar
    sm = plt.cm.ScalarMappable(cmap=cmap, norm=norm)
    sm.set_array([])
    cbar = fig.colorbar(sm, ax=ax, orientation='horizontal', pad=0.05, aspect=40)
    cbar.set_label('Daily Percentage Change (%)', fontsize=10)
    
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Save the figure
    output_path = os.path.join(output_dir, 'sp500_heatmap.png')
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"Heatmap saved to {output_path}")
    return output_path

def main():
    try:
        # Load S&P 500 data
        df = load_sp500_data()
        
        # Create heatmap
        create_heatmap(df)
        
        print("Heatmap created successfully!")
    except Exception as e:
        print(f"Error creating heatmap: {e}")

if __name__ == "__main__":
    main() 