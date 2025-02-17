import pygame
import sys
import math
import random

# Initialize Pygame
pygame.init()
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Spinning Long Blue Velour Sofa on the Floor")
clock = pygame.time.Clock()

# Colors
BLUE_VELOUR = (30, 144, 255)   # Deep blue for the sofa
DARK_BLUE = (0, 0, 139)         # For the sofa's arms
LIGHT_BLUE = (50, 170, 255)     # For cushion outlines
SKY_COLOR = (135, 206, 235)     # Light blue sky
FLOOR_COLOR = (139, 69, 19)     # Brownish floor

# Create a surface for the sofa (with per-pixel alpha)
sofa_width, sofa_height = 300, 100
# Add margin so the rotated image doesn't get clipped.
sofa_surface_size = (sofa_width + 40, sofa_height + 40)
sofa_surface = pygame.Surface(sofa_surface_size, pygame.SRCALPHA)

def draw_sofa(surface):
    """Draw a simplified long blue velour sofa on the given surface."""
    # Draw the main seat as a rounded rectangle.
    base_rect = pygame.Rect(20, 20, sofa_width, sofa_height)
    pygame.draw.rect(surface, BLUE_VELOUR, base_rect, border_radius=20)
    
    # Add cushion detail by drawing an inner rounded rectangle outline.
    cushion_rect = pygame.Rect(35, 35, sofa_width - 30, sofa_height - 30)
    pygame.draw.rect(surface, LIGHT_BLUE, cushion_rect, border_radius=15, width=3)
    
    # Draw arms on either side to enhance the sofa look.
    arm_width = 15
    left_arm = pygame.Rect(10, 20, arm_width, sofa_height)
    right_arm = pygame.Rect(sofa_width + 20 - 5, 20, arm_width, sofa_height)
    pygame.draw.rect(surface, DARK_BLUE, left_arm, border_radius=10)
    pygame.draw.rect(surface, DARK_BLUE, right_arm, border_radius=10)

# Pre-draw the sofa onto its surface.
draw_sofa(sofa_surface)

# Rotation and shiver parameters
angle = 0
rotation_speed = 1            # Degrees per frame.
shiver_frames = 0             # How many frames remain for the shiver effect.
shiver_intensity = 5          # Maximum pixel offset during shiver.

# For detecting clicks on the sofa.
click_pos = None

# Set the floor's vertical position (where the floor meets the wall).
floor_y = int(HEIGHT * 0.8)   # Adjust this to raise/lower the floor.

running = True
while running:
    # Event handling: record click position (if any) and quit event.
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

        # Record the click position if mouse button is pressed.
        if event.type == pygame.MOUSEBUTTONDOWN:
            click_pos = event.pos

    # Draw the background:
    # 1. Fill the sky.
    screen.fill(SKY_COLOR)
    # 2. Draw the floor as a simple polygon (a flat plane).
    floor_polygon = [(0, floor_y), (WIDTH, floor_y), (WIDTH, HEIGHT), (0, HEIGHT)]
    pygame.draw.polygon(screen, FLOOR_COLOR, floor_polygon)

    # Update the rotation angle.
    angle = (angle + rotation_speed) % 360

    # --- Transform the sofa for display ---
    # Rotate the original sofa surface.
    rotated_sofa = pygame.transform.rotate(sofa_surface, angle)
    
    # Apply a non-uniform scale to simulate a perspective view from a low camera.
    # Here we keep the width unchanged but squash the height.
    perspective_scale = 0.6  # Values less than 1 squash vertically.
    rotated_width = rotated_sofa.get_width()
    rotated_height = rotated_sofa.get_height()
    scaled_height = int(rotated_height * perspective_scale)
    sofa_image = pygame.transform.scale(rotated_sofa, (rotated_width, scaled_height))
    
    # Position the sofa so that its bottom center touches the floor.
    sofa_rect = sofa_image.get_rect()
    sofa_rect.midbottom = (WIDTH // 2, floor_y)

    # --- Check if the click was on the sofa ---
    if click_pos is not None and sofa_rect.collidepoint(click_pos):
        shiver_frames = 15  # Shiver for 15 frames.
    click_pos = None  # Reset the click.

    # --- Apply shiver effect if active ---
    if shiver_frames > 0:
        offset_x = random.randint(-shiver_intensity, shiver_intensity)
        offset_y = random.randint(-shiver_intensity, shiver_intensity)
        sofa_rect.x += offset_x
        sofa_rect.y += offset_y
        shiver_frames -= 1

    # Blit (draw) the final sofa image onto the screen.
    screen.blit(sofa_image, sofa_rect.topleft)

    pygame.display.flip()
    clock.tick(60)

pygame.quit()
sys.exit()