import pygame
import noise
import numpy as np
import random
import math

# Define a modified noise function to produce "mountainous" terrain.
def f(x, y, noise_scale, octaves=6, persistence=0.5, lacunarity=2.0):
    # Get raw Perlin noise in [-1, 1]
    raw = noise.pnoise2(x * noise_scale, y * noise_scale, 
                          octaves=octaves, persistence=persistence, lacunarity=lacunarity)
    # Convert raw noise from [-1, 1] to [0, 1]
    normalized = (raw + 1) / 2
    # Apply an exponent > 1 to deepen the valleys and sharpen the peaks
    mountain = normalized ** 1.5  
    # Map back to [-1, 1]
    return mountain * 2 - 1

# Approximate the gradient using central differences.
def grad_f(x, y, noise_scale, h=1.0, octaves=6, persistence=0.5, lacunarity=2.0):
    fx = (f(x + h, y, noise_scale, octaves, persistence, lacunarity) -
          f(x - h, y, noise_scale, octaves, persistence, lacunarity)) / (2 * h)
    fy = (f(x, y + h, noise_scale, octaves, persistence, lacunarity) -
          f(x, y - h, noise_scale, octaves, persistence, lacunarity)) / (2 * h)
    return fx, fy

# Generate a grayscale noise surface on a small grid.
def generate_noise_surface(width, height, noise_scale, octaves=6, persistence=0.5, lacunarity=2.0):
    # Create an array with shape (width, height, 3) for RGB values.
    arr = np.zeros((width, height, 3), dtype=np.uint8)
    for x in range(width):
        for y in range(height):
            # Get the "mountainous" noise value at (x, y)
            n = f(x, y, noise_scale, octaves, persistence, lacunarity)
            # Map the value from [-1,1] to [0,255]
            val = int((n + 1) / 2 * 255)
            arr[x, y] = (val, val, val)
    surface = pygame.surfarray.make_surface(arr)
    return surface

def main():
    pygame.init()
    window_width, window_height = 600, 600
    screen = pygame.display.set_mode((window_width, window_height))
    pygame.display.set_caption("Gradient Descent on Mountainous Perlin Noise Map")

    # --- Noise background parameters ---
    # We generate the noise on a low-resolution grid and then upscale.
    noise_map_width, noise_map_height = 300, 300
    noise_scale = 0.005   # Lower scale to generate larger, mountain-like features.
    octaves = 6
    persistence = 0.5
    lacunarity = 2.0
    scale_factor = window_width / noise_map_width  # Used to scale from noise-map space to window space.

    # Generate the noise map surface and scale it to the window size.
    noise_surface_small = generate_noise_surface(noise_map_width, noise_map_height, noise_scale, octaves, persistence, lacunarity)
    background_surface = pygame.transform.smoothscale(noise_surface_small, (window_width, window_height))

    # --- Gradient descent parameters ---
    # A smaller learning rate is often useful when the landscape is rugged.
    learning_rate = 0.5  
    h = 1.0             # Finite difference step.
    grad_threshold = 1e-3  # When the gradient magnitude is below this, we consider it a minimum.
    max_iterations = 10000

    # Start at a random point in the noise-map coordinates.
    x = random.uniform(0, noise_map_width)
    y = random.uniform(0, noise_map_height)
    path = [(x, y)]
    iteration = 0
    converged = False

    clock = pygame.time.Clock()
    running = True
    while running:
        clock.tick(60)  # Limit to 60 FPS.
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # Perform one gradient descent step per frame if not yet converged.
        if not converged and iteration < max_iterations:
            grad_x, grad_y = grad_f(x, y, noise_scale, h, octaves, persistence, lacunarity)
            grad_norm = math.sqrt(grad_x**2 + grad_y**2)
            if grad_norm < grad_threshold:
                converged = True
                print("Converged at iteration", iteration, "position:", (x, y), "with gradient norm:", grad_norm)
            else:
                # Move against the gradient.
                x = x - learning_rate * grad_x
                y = y - learning_rate * grad_y

                # Clamp the position to the boundaries of the noise map.
                x = max(0, min(x, noise_map_width - 1))
                y = max(0, min(y, noise_map_height - 1))

                path.append((x, y))
                iteration += 1

        # --- Drawing ---
        # Draw the background.
        screen.blit(background_surface, (0, 0))

        # Scale and draw the gradient descent path (blue line).
        if len(path) > 1:
            scaled_path = [(int(px * scale_factor), int(py * scale_factor)) for (px, py) in path]
            pygame.draw.lines(screen, (0, 0, 255), False, scaled_path, 2)

        # Draw the current position as a red circle.
        current_pos = (int(x * scale_factor), int(y * scale_factor))
        pygame.draw.circle(screen, (255, 0, 0), current_pos, 5)

        pygame.display.flip()

    pygame.quit()

if __name__ == "__main__":
    main()