import pygame
import noise
import numpy as np
import random
import math

# --- Perlin Noise Functions for a "Mountainous" Landscape ---

def f(x, y, noise_scale, octaves=6, persistence=0.5, lacunarity=2.0):
    """
    Mountainous noise function. It returns a value in [-1,1] where
    peaks and valleys are accentuated.
    """
    # Get raw Perlin noise in [-1, 1]
    raw = noise.pnoise2(x * noise_scale, y * noise_scale, 
                          octaves=octaves, persistence=persistence, lacunarity=lacunarity)
    # Normalize to [0, 1]
    normalized = (raw + 1) / 2
    # Exaggerate the mountainous features (raise peaks and deepen valleys)
    mountain = normalized ** 1.5  
    # Map back to [-1, 1]
    return mountain * 2 - 1

def grad_f(x, y, noise_scale, h=1.0, octaves=6, persistence=0.5, lacunarity=2.0):
    """
    Approximates the gradient of f at (x,y) using central differences.
    """
    fx = (f(x + h, y, noise_scale, octaves, persistence, lacunarity) -
          f(x - h, y, noise_scale, octaves, persistence, lacunarity)) / (2 * h)
    fy = (f(x, y + h, noise_scale, octaves, persistence, lacunarity) -
          f(x, y - h, noise_scale, octaves, persistence, lacunarity)) / (2 * h)
    return fx, fy

def generate_noise_surface(width, height, noise_scale, octaves=6, persistence=0.5, lacunarity=2.0):
    """
    Generates a low-resolution grayscale surface representing the noise map.
    """
    arr = np.zeros((width, height, 3), dtype=np.uint8)
    for x in range(width):
        for y in range(height):
            n = f(x, y, noise_scale, octaves, persistence, lacunarity)
            # Map n from [-1,1] to [0,255]
            val = int((n + 1) / 2 * 255)
            arr[x, y] = (val, val, val)
    surface = pygame.surfarray.make_surface(arr)
    return surface

# --- Main Program ---

def main():
    pygame.init()
    window_width, window_height = 600, 600
    screen = pygame.display.set_mode((window_width, window_height))
    pygame.display.set_caption("Gradient Descent & Monte Carlo on Mountainous Noise Map")

    # --- Noise Background Parameters ---
    noise_map_width, noise_map_height = 300, 300
    noise_scale = 0.005   # Lower scale for larger, mountain-like features.
    octaves = 6
    persistence = 0.5
    lacunarity = 2.0
    scale_factor = window_width / noise_map_width  # Used for scaling coordinates.

    # Generate and upscale the noise background.
    noise_surface_small = generate_noise_surface(noise_map_width, noise_map_height, noise_scale, octaves, persistence, lacunarity)
    background_surface = pygame.transform.smoothscale(noise_surface_small, (window_width, window_height))

    # --- Gradient Descent Parameters ---
    gd_learning_rate = 0.5
    gd_h = 1.0             # Finite difference step.
    gd_grad_threshold = 1e-3
    gd_max_iterations = 10000
    x_gd = random.uniform(0, noise_map_width)
    y_gd = random.uniform(0, noise_map_height)
    gd_path = [(x_gd, y_gd)]
    gd_iterations = 0
    gd_converged = False

    # --- Monte Carlo Simulation (Simulated Annealing) Parameters ---
    mc_step_size = 5.0  # Maximum distance to move in one proposal.
    mc_initial_temperature = 1.0
    mc_temperature = mc_initial_temperature
    mc_cooling_rate = 0.995  # Temperature multiplier per iteration.
    mc_max_iterations = 10000
    mc_temperature_threshold = 1e-3  # When temperature is very low, we stop.
    x_mc = random.uniform(0, noise_map_width)
    y_mc = random.uniform(0, noise_map_height)
    mc_path = [(x_mc, y_mc)]
    mc_iterations = 0
    mc_converged = False

    clock = pygame.time.Clock()
    running = True

    while running:
        clock.tick(60)  # Limit to 60 frames per second.
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # --- Gradient Descent Step ---
        if not gd_converged and gd_iterations < gd_max_iterations:
            grad_x, grad_y = grad_f(x_gd, y_gd, noise_scale, gd_h, octaves, persistence, lacunarity)
            grad_norm = math.sqrt(grad_x**2 + grad_y**2)
            if grad_norm < gd_grad_threshold:
                gd_converged = True
                print("Gradient Descent converged at iteration", gd_iterations,
                      "position:", (x_gd, y_gd), "grad norm:", grad_norm)
            else:
                # Move in the negative gradient direction.
                x_gd = x_gd - gd_learning_rate * grad_x
                y_gd = y_gd - gd_learning_rate * grad_y
                # Clamp position to the noise map boundaries.
                x_gd = max(0, min(x_gd, noise_map_width - 1))
                y_gd = max(0, min(y_gd, noise_map_height - 1))
                gd_path.append((x_gd, y_gd))
                gd_iterations += 1

        # --- Monte Carlo (Simulated Annealing) Step ---
        if not mc_converged and mc_iterations < mc_max_iterations:
            current_val = f(x_mc, y_mc, noise_scale, octaves, persistence, lacunarity)
            # Propose a new candidate position.
            candidate_x = x_mc + random.uniform(-mc_step_size, mc_step_size)
            candidate_y = y_mc + random.uniform(-mc_step_size, mc_step_size)
            candidate_x = max(0, min(candidate_x, noise_map_width - 1))
            candidate_y = max(0, min(candidate_y, noise_map_height - 1))
            candidate_val = f(candidate_x, candidate_y, noise_scale, octaves, persistence, lacunarity)
            delta = candidate_val - current_val
            # Always accept if the candidate is lower; otherwise, accept with a probability.
            if delta < 0:
                accept_prob = 1.0
            else:
                accept_prob = math.exp(-delta / mc_temperature) if mc_temperature > 0 else 0
            if random.random() < accept_prob:
                x_mc, y_mc = candidate_x, candidate_y
                mc_path.append((x_mc, y_mc))
            # Cool the system.
            mc_temperature *= mc_cooling_rate
            if mc_temperature < mc_temperature_threshold:
                mc_converged = True
                print("Monte Carlo simulation converged at iteration", mc_iterations,
                      "position:", (x_mc, y_mc), "temperature:", mc_temperature)
            mc_iterations += 1

        # --- Drawing ---
        screen.blit(background_surface, (0, 0))
        
        # Draw the gradient descent path in blue.
        if len(gd_path) > 1:
            scaled_gd_path = [(int(px * scale_factor), int(py * scale_factor)) for (px, py) in gd_path]
            pygame.draw.lines(screen, (0, 0, 255), False, scaled_gd_path, 2)
        # Draw the Monte Carlo path in green.
        if len(mc_path) > 1:
            scaled_mc_path = [(int(px * scale_factor), int(py * scale_factor)) for (px, py) in mc_path]
            pygame.draw.lines(screen, (0, 255, 0), False, scaled_mc_path, 2)
        
        # Draw current positions:
        # - Red circle for Gradient Descent.
        # - Yellow circle for Monte Carlo.
        gd_pos = (int(x_gd * scale_factor), int(y_gd * scale_factor))
        mc_pos = (int(x_mc * scale_factor), int(y_mc * scale_factor))
        pygame.draw.circle(screen, (255, 0, 0), gd_pos, 5)
        pygame.draw.circle(screen, (255, 255, 0), mc_pos, 5)

        pygame.display.flip()

    pygame.quit()

if __name__ == "__main__":
    main()