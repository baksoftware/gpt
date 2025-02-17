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
    # Initialize pygame and its font system.
    pygame.init()
    pygame.font.init()
    width, height = 800, 600
    screen = pygame.display.set_mode((width, height))
    pygame.display.set_caption("Lumpmass Power Cable Simulation with Drag & Tension")
    clock = pygame.time.Clock()

    # Create a font for displaying tension.
    font = pygame.font.SysFont(None, 24)

    # --------------------------------------------------
    # Simulation Parameters
    # --------------------------------------------------
    n_points = 20               # Number of lumped masses along the cable
    cable_length = 120.0        # Total cable length in meters (so it must sag between supports)
    rest_length = cable_length / (n_points - 1)  # Rest (ideal) distance between adjacent masses
    density = 20.0              # Cable mass per meter (kg/m) [for reference]

    # Fixed endpoints in simulation coordinates (in meters).
    # The endpoints are 100 m apart horizontally.
    start = Vector2(0, 0)
    end = Vector2(100, 0)

    # Create the mass points, initially spaced in a straight line between the endpoints.
    # (Since the cable’s total length is 120 m, the points start closer together than their rest spacing.
    # The constraint solver then “pulls” the cable into a sagging curve.)
    points = []
    for i in range(n_points):
        t = i / (n_points - 1)
        pos = start.lerp(end, t)
        # Pin the endpoints.
        pinned = (i == 0 or i == n_points - 1)
        points.append(MassPoint(pos, pinned))

    # Build a list of constraints connecting consecutive points.
    # Each constraint is a tuple: (index1, index2, rest_length)
    constraints = []
    for i in range(n_points - 1):
        constraints.append((i, i + 1, rest_length))

    # Physics parameters for the Verlet integration:
    gravity = Vector2(0, 9.81)  # gravitational acceleration (m/s^2)
    dt = 0.016                 # time step (seconds) ~60fps; note that acceleration is multiplied by dt^2
    damping = 0.99             # damping factor to reduce oscillations
    constraint_iterations = 50 # number of relaxation iterations per frame

    # Drawing scale and offset:
    # (This converts simulation meters into pixels.)
    scale = 5                   # 1 meter = 5 pixels
    offset = Vector2(150, 100)  # offset to center the cable in the window

    # -----------------------------
    # Variables for dragging interaction
    # -----------------------------
    dragging_index = None  # Index of the mass point being dragged (None if no point is selected)
    drag_radius = 10       # Radius (in pixels) to consider a click “on” a mass

    # -----------------------------
    # Main loop.
    # -----------------------------
    running = True
    while running:
        # --- Event Handling ---
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            # Check for mouse button down: if a free (unpinned) point is near the mouse, start dragging it.
            elif event.type == pygame.MOUSEBUTTONDOWN:
                mouse_pos = Vector2(pygame.mouse.get_pos())
                # Loop over points and check distance in screen coordinates.
                for i, point in enumerate(points):
                    point_screen = point.pos * scale + offset
                    if (point_screen - mouse_pos).length() < drag_radius:
                        # Only allow dragging of unpinned points.
                        if not point.pinned:
                            dragging_index = i
                        break

            # When the mouse button is released, stop dragging.
            elif event.type == pygame.MOUSEBUTTONUP:
                dragging_index = None

        # --- If a mass is being dragged, update its position to follow the mouse. ---
        if dragging_index is not None:
            # Get the mouse position (in pixels) and convert to simulation coordinates.
            mouse_sim = (Vector2(pygame.mouse.get_pos()) - offset) / scale
            dragged_point = points[dragging_index]
            dragged_point.pos = mouse_sim
            dragged_point.old_pos = mouse_sim

        # --- Verlet Integration Update ---
        for point in points:
            if not point.pinned and (dragging_index is None or point != points[dragging_index]):
                # Compute approximate velocity using the difference between current and old positions.
                velocity = (point.pos - point.old_pos) * damping
                # Verlet integration: new position = current position + velocity + acceleration * dt^2
                new_pos = point.pos + velocity + gravity * (dt * dt)
                point.old_pos = point.pos.copy()
                point.pos = new_pos

        # --- Constraint Relaxation ---
        # Iteratively adjust the positions so that adjacent masses remain near their rest distance.
        for _ in range(constraint_iterations):
            for (i, j, rest_length) in constraints:
                p1 = points[i]
                p2 = points[j]
                delta = p2.pos - p1.pos
                d = delta.length()
                if d == 0:
                    continue  # Avoid division by zero.
                difference = (d - rest_length) / d

                # If both points are free, move both; if one is pinned, move only the free point.
                if not p1.pinned and not p2.pinned:
                    correction = delta * 0.5 * difference
                    p1.pos += correction
                    p2.pos -= correction
                elif p1.pinned and not p2.pinned:
                    correction = delta * difference
                    p2.pos -= correction
                elif p2.pinned and not p1.pinned:
                    correction = delta * difference
                    p1.pos += correction

        # --- Compute Tension ---
        # For this demo, we define the "tension" in each segment as the absolute difference
        # between the current segment length and its rest length.
        max_tension = 0.0
        for (i, j, rest_length) in constraints:
            delta = points[j].pos - points[i].pos
            current_length = delta.length()
            tension = abs(current_length - rest_length)
            if tension > max_tension:
                max_tension = tension

        # --- Drawing ---
        screen.fill((0, 0, 0))  # Clear screen with black.

        # Draw the cable segments (white lines connecting the mass points).
        for i in range(n_points - 1):
            p1_screen = points[i].pos * scale + offset
            p2_screen = points[i + 1].pos * scale + offset
            pygame.draw.line(screen, (255, 255, 255),
                             (int(p1_screen.x), int(p1_screen.y)),
                             (int(p2_screen.x), int(p2_screen.y)), 2)

        # Draw the mass points as red circles.
        for point in points:
            p_screen = point.pos * scale + offset
            pygame.draw.circle(screen, (255, 0, 0), (int(p_screen.x), int(p_screen.y)), 5)

        # Display the maximum tension as a label in the top-left corner.
        tension_label = font.render(f"Tension: {max_tension:.3f} m", True, (255, 255, 255))
        screen.blit(tension_label, (10, 10))

        pygame.display.flip()  # Update the full display.
        clock.tick(60)         # Limit to 60 frames per second.

    pygame.quit()
    sys.exit()

# -----------------------------
# Run the simulation.
# -----------------------------
if __name__ == '__main__':
    main()