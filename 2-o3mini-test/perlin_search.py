import pygame
import noise
import numpy as np
import random
import math

# Define our noise function.
# Here, f(x, y) returns the Perlin noise value at the (scaled) position.
def f(x, y, noise_scale, octaves=1):
    return noise.pnoise2(x * noise_scale, y * noise_scale, octaves=octaves)

# Approximate the gradient using central differences.
def grad_f(x, y, noise_scale, h=1.0, octaves=1):
    fx = (f(x + h, y, noise_scale, octaves) - f(x - h, y, noise_scale, octaves)) / (2 * h)
    fy = (f(x, y + h, noise_scale, octaves) - f(x, y - h, noise_scale, octaves)) / (2 * h)
    return fx, fy

# Generate a grayscale noise surface on a small grid.
def generate_noise_surface(width, height, noise_scale, octaves=1):
    # Create an array of shape (width, height, 3). Note that pygame’s
    # surfarray.make_surface expects the first dimension to be the width.
    arr = np.zeros((width, height, 3), dtype=np.uint8)
    for x in range(width):
        for y in range(height):
            # Get the noise value in [-1, 1]
            n = f(x, y, noise_scale, octaves)
            # Map it to [0, 255]
            val = int((n + 1) / 2 * 255)
            arr[x, y] = (val, val, val)
    surface = pygame.surfarray.make_surface(arr)
    return surface

def main():
    # Initialize pygame.
    pygame.init()
    window_width, window_height = 600, 600
    screen = pygame.display.set_mode((window_width, window_height))
    pygame.display.set_caption("Gradient Descent on Perlin Noise Map")

    # --- Noise background parameters ---
    # We generate the noise on a low-resolution grid and then upscale.
    noise_map_width, noise_map_height = 300, 300
    noise_scale = 0.1   # Controls the “frequency” of the noise.
    octaves = 1         # You can increase octaves for more detail.
    scale_factor = window_width / noise_map_width  # In this example, 600/300 = 2.

    # Generate the noise map surface and then scale it to the window size.
    noise_surface_small = generate_noise_surface(noise_map_width, noise_map_height, noise_scale, octaves)
    background_surface = pygame.transform.smoothscale(noise_surface_small, (window_width, window_height))

    # --- Gradient descent parameters ---
    learning_rate = 10.0  # Adjust to control step size.
    h = 1.0             # Finite difference step.
    grad_threshold = 1e-3  # When gradient magnitude is below this, we consider it a minimum.
    max_iterations = 10000

    # Start at a random point in the noise-map coordinates (0 to noise_map_width/height).
    x = random.uniform(0, noise_map_width)
    y = random.uniform(0, noise_map_height)
    path = [(x, y)]
    iteration = 0
    converged = False

    clock = pygame.time.Clock()
    running = True
    while running:
        clock.tick(60)  # Limit to 60 frames per second.
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # If we haven’t converged and haven't exceeded our iteration limit,
        # do one gradient descent update per frame.
        if not converged and iteration < max_iterations:
            grad_x, grad_y = grad_f(x, y, noise_scale, h, octaves)
            grad_norm = math.sqrt(grad_x**2 + grad_y**2)
            if grad_norm < grad_threshold:
                converged = True
                print("Converged at iteration", iteration, "position:", (x, y), "with gradient norm:", grad_norm)
            else:
                # Update the current position by moving against the gradient.
                x = x - learning_rate * grad_x
                y = y - learning_rate * grad_y

                # Optionally, clamp the position so it stays inside the noise map.
                x = max(0, min(x, noise_map_width - 1))
                y = max(0, min(y, noise_map_height - 1))

                path.append((x, y))
                iteration += 1

        # --- Drawing ---
        # First draw the background noise.
        screen.blit(background_surface, (0, 0))

        # Scale the path coordinates (from noise-map space) to the window space.
        if len(path) > 1:
            scaled_path = [(int(px * scale_factor), int(py * scale_factor)) for (px, py) in path]
            pygame.draw.lines(screen, (0, 0, 255), False, scaled_path, 2)  # Blue line for the path.

        # Draw the current position as a red circle.
        current_pos = (int(x * scale_factor), int(y * scale_factor))
        pygame.draw.circle(screen, (255, 0, 0), current_pos, 5)

        pygame.display.flip()

    pygame.quit()

if __name__ == "__main__":
    main()