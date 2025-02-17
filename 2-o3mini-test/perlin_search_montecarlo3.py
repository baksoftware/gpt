import pygame
import noise
import numpy as np
import random
import math

# --- Mountainous Noise Functions ---

def f(x, y, noise_scale, octaves=6, persistence=0.5, lacunarity=2.0):
    """
    Generates a "mountainous" noise value at (x, y). The raw Perlin noise is:
      - Normalized from [-1, 1] to [0, 1]
      - Raised to an exponent to deepen valleys and accentuate peaks
      - Mapped back to [-1, 1]
    """
    raw = noise.pnoise2(x * noise_scale, y * noise_scale,
                          octaves=octaves, persistence=persistence, lacunarity=lacunarity)
    normalized = (raw + 1) / 2
    mountain = normalized ** 1.5  # Exponent to enhance mountainous features
    return mountain * 2 - 1

def generate_noise_surface(width, height, noise_scale, octaves=6, persistence=0.5, lacunarity=2.0):
    """
    Generates a low-resolution grayscale pygame Surface representing the noise map.
    """
    arr = np.zeros((width, height, 3), dtype=np.uint8)
    for x in range(width):
        for y in range(height):
            n = f(x, y, noise_scale, octaves, persistence, lacunarity)
            # Map the noise value from [-1,1] to [0,255]
            val = int((n + 1) / 2 * 255)
            arr[x, y] = (val, val, val)
    surface = pygame.surfarray.make_surface(arr)
    return surface

# --- Main Program (Monte Carlo Simulation with Larger Jumps) ---

def main():
    pygame.init()
    window_width, window_height = 600, 600
    screen = pygame.display.set_mode((window_width, window_height))
    pygame.display.set_caption("Monte Carlo (Simulated Annealing) on Mountainous Noise Map")

    # --- Noise Background Parameters ---
    noise_map_width, noise_map_height = 300, 300
    noise_scale = 0.005   # Lower scale for larger, mountain-like features.
    octaves = 6
    persistence = 0.5
    lacunarity = 2.0
    scale_factor = window_width / noise_map_width  # Scale factor to convert noise-map coordinates to window pixels.

    # Generate and upscale the noise background.
    noise_surface_small = generate_noise_surface(noise_map_width, noise_map_height, noise_scale, octaves, persistence, lacunarity)
    background_surface = pygame.transform.smoothscale(noise_surface_small, (window_width, window_height))

    # --- Monte Carlo (Simulated Annealing) Parameters ---
    mc_step_size = 20.0  # Increased jump size for larger moves to help reach the global minimum.
    mc_initial_temperature = 1.0
    mc_temperature = mc_initial_temperature
    mc_cooling_rate = 0.995  # Cooling multiplier per iteration.
    mc_max_iterations = 10000
    mc_temperature_threshold = 1e-3  # Stop when temperature is very low.
    # Start at a random position in noise-map space.
    x_mc = random.uniform(0, noise_map_width)
    y_mc = random.uniform(0, noise_map_height)
    mc_path = [(x_mc, y_mc)]
    mc_iterations = 0
    mc_converged = False

    clock = pygame.time.Clock()
    running = True

    while running:
        clock.tick(60)  # Limit to 60 FPS.
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # --- Monte Carlo (Simulated Annealing) Step ---
        if not mc_converged and mc_iterations < mc_max_iterations:
            current_val = f(x_mc, y_mc, noise_scale, octaves, persistence, lacunarity)
            # Propose a new candidate position by taking a larger random step.
            candidate_x = x_mc + random.uniform(-mc_step_size, mc_step_size)
            candidate_y = y_mc + random.uniform(-mc_step_size, mc_step_size)
            # Clamp candidate to the noise map boundaries.
            candidate_x = max(0, min(candidate_x, noise_map_width - 1))
            candidate_y = max(0, min(candidate_y, noise_map_height - 1))
            candidate_val = f(candidate_x, candidate_y, noise_scale, octaves, persistence, lacunarity)
            delta = candidate_val - current_val

            # Accept if the candidate is lower (downhill) or with a probability if uphill.
            if delta < 0:
                accept_prob = 1.0
            else:
                accept_prob = math.exp(-delta / mc_temperature) if mc_temperature > 0 else 0

            if random.random() < accept_prob:
                x_mc, y_mc = candidate_x, candidate_y
                mc_path.append((x_mc, y_mc))

            # Cool the temperature.
            mc_temperature *= mc_cooling_rate
            if mc_temperature < mc_temperature_threshold:
                mc_converged = True
                print("Monte Carlo simulation converged at iteration", mc_iterations,
                      "position:", (x_mc, y_mc), "temperature:", mc_temperature)
            mc_iterations += 1

        # --- Drawing ---
        screen.blit(background_surface, (0, 0))
        
        # Draw the Monte Carlo path in green.
        if len(mc_path) > 1:
            scaled_mc_path = [(int(px * scale_factor), int(py * scale_factor)) for (px, py) in mc_path]
            pygame.draw.lines(screen, (0, 255, 0), False, scaled_mc_path, 2)
        
        # Draw the current Monte Carlo position as a yellow circle.
        mc_pos = (int(x_mc * scale_factor), int(y_mc * scale_factor))
        pygame.draw.circle(screen, (255, 255, 0), mc_pos, 5)

        pygame.display.flip()

    pygame.quit()

if __name__ == "__main__":
    main()