import math
import pygame
import sys

# Initialize Pygame
pygame.init()

# Screen dimensions
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Bouncing Ball in a Spinning Hexagon")

clock = pygame.time.Clock()

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
HEX_COLOR = (50, 150, 200)
BALL_COLOR = (200, 50, 50)

# Simulation parameters
dt = 1/60.0  # time step in seconds

# Ball properties
ball_radius = 10
ball_pos = pygame.Vector2(WIDTH/2, HEIGHT/2 - 100)
ball_vel = pygame.Vector2(150, 0)  # initial velocity in pixels/s

# Gravity and air friction
gravity = 500      # pixels/s^2 downward
air_friction = 0.999  # applied each frame to simulate drag

# Bounce properties
restitution = 0.9  # bounciness in the normal direction
wall_friction = 0.8  # friction (damping) on the tangential component upon collision

# Hexagon properties
hex_center = pygame.Vector2(WIDTH/2, HEIGHT/2)
hex_radius = 200
num_sides = 6
hex_rotation = 0         # initial rotation angle (radians)
angular_velocity = 1.0   # radians per second (positive rotates counterclockwise)

def get_hexagon_vertices(center, radius, rotation, num_sides):
    """Return list of vertices (pygame.Vector2) for a regular polygon."""
    vertices = []
    for i in range(num_sides):
        angle = rotation + 2 * math.pi * i / num_sides
        x = center.x + radius * math.cos(angle)
        y = center.y + radius * math.sin(angle)
        vertices.append(pygame.Vector2(x, y))
    return vertices

def project_point_on_segment(p, a, b):
    """
    Project point p onto the line segment defined by a and b.
    Returns the closest point on the segment.
    """
    ab = b - a
    if ab.length_squared() == 0:
        return a
    t = (p - a).dot(ab) / ab.length_squared()
    t = max(0, min(1, t))
    return a + ab * t

def wall_velocity_at_point(point, center, angular_velocity):
    """
    Given the rotation of the hexagon, compute the wall (tangential)
    velocity at a point on the wall. The velocity is given by v = ω × r.
    For 2D rotation (about the center) this is:
         v = angular_velocity * (-dy, dx)
    where (dx,dy) = point - center.
    """
    r = point - center
    # Perpendicular: (-r.y, r.x)
    return pygame.Vector2(-r.y, r.x) * angular_velocity

running = True
while running:
    # Handle events.
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    # Update time and hexagon rotation.
    dt = clock.tick(60) / 1000.0  # frame time in seconds
    hex_rotation += angular_velocity * dt

    # Compute hexagon vertices (in world coordinates)
    hex_vertices = get_hexagon_vertices(hex_center, hex_radius, hex_rotation, num_sides)

    # Update ball velocity and position.
    ball_vel.y += gravity * dt
    ball_vel *= air_friction  # air damping
    ball_pos += ball_vel * dt

    # Check collision with each edge of the hexagon.
    for i in range(num_sides):
        # Get the endpoints for the current edge.
        p1 = hex_vertices[i]
        p2 = hex_vertices[(i + 1) % num_sides]

        # Compute the closest point on the edge to the ball center.
        closest = project_point_on_segment(ball_pos, p1, p2)
        displacement = ball_pos - closest
        distance = displacement.length()

        if distance < ball_radius:
            # There is penetration.
            if distance != 0:
                normal = displacement.normalize()
            else:
                # In the unlikely event ball center exactly on edge, use the edge normal.
                edge = p2 - p1
                normal = pygame.Vector2(-edge.y, edge.x).normalize()
            
            # Determine the "inside" normal.
            # For a convex polygon the interior is on the same side for each edge.
            # We test by comparing the vector from the edge midpoint to the hexagon center.
            edge_mid = (p1 + p2) / 2
            to_center = (hex_center - edge_mid).normalize()
            # If the computed normal is not pointing inward, flip it.
            if normal.dot(to_center) < 0:
                normal = -normal

            # Move the ball out of penetration.
            penetration_depth = ball_radius - distance
            ball_pos += normal * penetration_depth

            # Compute wall velocity at the collision point.
            v_wall = wall_velocity_at_point(closest, hex_center, angular_velocity)

            # Compute relative velocity.
            rel_vel = ball_vel - v_wall

            # Decompose relative velocity into normal and tangential components.
            vn = rel_vel.dot(normal)
            vt = rel_vel - vn * normal

            # Only reflect if the ball is moving into the wall.
            if vn < 0:
                # Reflect the normal component and damp the tangential component.
                new_rel_vel = -restitution * vn * normal + wall_friction * vt
                # Update ball velocity by adding back the wall's velocity.
                ball_vel = new_rel_vel + v_wall

    # Clear screen.
    screen.fill(BLACK)

    # Draw hexagon.
    pygame.draw.polygon(screen, HEX_COLOR, [(v.x, v.y) for v in hex_vertices], width=3)

    # Draw ball.
    pygame.draw.circle(screen, BALL_COLOR, (int(ball_pos.x), int(ball_pos.y)), ball_radius)

    # Flip display.
    pygame.display.flip()

pygame.quit()
sys.exit()