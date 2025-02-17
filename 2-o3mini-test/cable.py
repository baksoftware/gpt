import sys
import pygame
from pygame.math import Vector2

# -----------------------------
# Define a class for a mass point.
# -----------------------------
class MassPoint:
    def __init__(self, pos, pinned=False):
        # pos and old_pos are stored in “meters” (simulation units)
        self.pos = Vector2(pos)
        self.old_pos = Vector2(pos)
        self.pinned = pinned

# -----------------------------
# Main simulation function.
# -----------------------------
def main():
    # Initialize pygame
    pygame.init()
    width, height = 800, 600
    screen = pygame.display.set_mode((width, height))
    pygame.display.set_caption("Lumpmass Power Cable Simulation")
    clock = pygame.time.Clock()

    # --------------------------------------------------
    # Simulation Parameters
    # --------------------------------------------------
    n_points = 20               # Number of lumped masses along the cable
    cable_length = 120.0        # Total cable length in meters (so it must sag between supports)
    rest_length = cable_length / (n_points - 1)  # Rest (ideal) distance between adjacent masses
    density = 20.0              # Cable mass per meter (kg/m) [for reference]

    # Fixed endpoints in simulation coordinates (in meters).
    # We set the horizontal separation to 100 m.
    start = Vector2(0, 0)
    end = Vector2(100, 0)

    # Create the mass points, initially spaced in a straight line between the endpoints.
    # (Because the cable’s length is 120 m, the initial spacing (100/(n_points-1))
    # is less than the rest length. The constraint solver will “pull” the cable into a sagging curve.)
    points = []
    for i in range(n_points):
        t = i / (n_points - 1)
        pos = start.lerp(end, t)  # Linear interpolation between start and end.
        # Pin the endpoints (first and last mass)
        pinned = (i == 0 or i == n_points - 1)
        points.append(MassPoint(pos, pinned))

    # Build the list of constraints connecting each consecutive pair of points.
    # Each constraint is a tuple: (index1, index2, rest_length)
    constraints = []
    for i in range(n_points - 1):
        constraints.append((i, i + 1, rest_length))

    # Physics parameters for the Verlet integration:
    gravity = Vector2(0, 9.81)  # gravitational acceleration (m/s^2)
    dt = 0.016                 # time step (seconds) ~60fps; note that in Verlet, acceleration is multiplied by dt^2
    damping = 0.99             # simple velocity damping to reduce oscillations
    constraint_iterations = 50 # number of times to iterate over constraints per frame

    # Drawing scale and offset:
    # We want to convert simulation meters into pixels.
    scale = 5                   # 1 meter = 5 pixels
    offset = Vector2(150, 100)  # offset (in pixels) to center the cable in the window

    # -----------------------------
    # Main loop.
    # -----------------------------
    running = True
    while running:
        # --- Event Handling ---
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # --- Verlet Integration Update ---
        for point in points:
            if not point.pinned:
                # Calculate approximate velocity from the difference in positions.
                velocity = (point.pos - point.old_pos) * damping
                # Verlet update: new position = current position + velocity + (acceleration * dt^2)
                new_pos = point.pos + velocity + gravity * (dt * dt)
                # Store the old position and update the current position.
                point.old_pos = point.pos.copy()
                point.pos = new_pos

        # --- Constraint Relaxation ---
        # We iterate several times so that the cable segments nearly maintain their rest length.
        for _ in range(constraint_iterations):
            for (i, j, rest_length) in constraints:
                p1 = points[i]
                p2 = points[j]
                delta = p2.pos - p1.pos
                d = delta.length()
                if d == 0:
                    continue  # avoid division by zero
                # Compute how far off we are from the desired rest length.
                difference = (d - rest_length) / d

                # For two free (unpinned) masses, move each by half the correction.
                if not p1.pinned and not p2.pinned:
                    correction = delta * 0.5 * difference
                    p1.pos += correction
                    p2.pos -= correction
                # If one end is pinned, move only the free point.
                elif p1.pinned and not p2.pinned:
                    correction = delta * difference
                    p2.pos -= correction
                elif p2.pinned and not p1.pinned:
                    correction = delta * difference
                    p1.pos += correction

        # --- Drawing ---
        screen.fill((0, 0, 0))  # Clear screen with black

        # Draw the cable as lines connecting the mass points.
        for i in range(n_points - 1):
            # Convert simulation positions (meters) to screen coordinates (pixels)
            p1_screen = points[i].pos * scale + offset
            p2_screen = points[i + 1].pos * scale + offset
            pygame.draw.line(screen, (255, 255, 255),
                             (int(p1_screen.x), int(p1_screen.y)),
                             (int(p2_screen.x), int(p2_screen.y)), 2)

        # Optionally, draw each mass point as a red circle.
        for point in points:
            p_screen = point.pos * scale + offset
            pygame.draw.circle(screen, (255, 0, 0), (int(p_screen.x), int(p_screen.y)), 5)

        pygame.display.flip()  # Update the full display surface to the screen
        clock.tick(60)         # Limit to 60 frames per second

    pygame.quit()
    sys.exit()

# -----------------------------
# Run the simulation if this script is executed.
# -----------------------------
if __name__ == '__main__':
    main()