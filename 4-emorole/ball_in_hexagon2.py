import math
import random
import pygame
import sys

# Initialize Pygame
pygame.init()

# Screen dimensions
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("10 Bouncing Balls in a Spinning Hexagon")

clock = pygame.time.Clock()

# Colors
BLACK = (0, 0, 0)
HEX_COLOR = (50, 150, 200)

# Simulation parameters
dt = 1/60.0  # time step in seconds

# Physics parameters
gravity = 500         # pixels/s^2 downward
air_friction = 0.999  # applied each frame to simulate drag
restitution = 0.9     # bounce bounciness
wall_friction = 0.8   # friction (damping) on the tangential component upon collision

# Hexagon properties
hex_center = pygame.Vector2(WIDTH / 2, HEIGHT / 2)
hex_radius = 200
num_sides = 6
hex_rotation = 0         # initial rotation angle (radians)
angular_velocity = 1.0   # radians per second (rotating counterclockwise)

# Ball class
class Ball:
    def __init__(self, pos, vel, radius, color):
        self.pos = pygame.Vector2(pos)
        self.vel = pygame.Vector2(vel)
        self.radius = radius
        self.color = color

    def update(self, dt):
        # Apply gravity
        self.vel.y += gravity * dt
        # Apply air friction
        self.vel *= air_friction
        # Update position
        self.pos += self.vel * dt

    def draw(self, surface):
        pygame.draw.circle(surface, self.color, (int(self.pos.x), int(self.pos.y)), self.radius)

def random_color():
    """Return a random RGB color tuple."""
    return (random.randint(50, 255), random.randint(50, 255), random.randint(50, 255))

# Create 10 balls with random colors, sizes, positions, and velocities.
balls = []
for _ in range(10):
    # Choose a random radius between 8 and 20 pixels.
    radius = random.randint(8, 20)
    # Start them near the hexagon center with a slight random offset.
    offset = pygame.Vector2(random.uniform(-50, 50), random.uniform(-50, 50))
    pos = hex_center + offset
    # Give each ball a random initial velocity.
    vel = pygame.Vector2(random.uniform(-150, 150), random.uniform(-150, 150))
    color = random_color()
    balls.append(Ball(pos, vel, radius, color))

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
    velocity at a point on the wall. For 2D rotation (about the center) this is:
         v = angular_velocity * (-dy, dx)
    where (dx,dy) = point - center.
    """
    r = point - center
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

    # Compute hexagon vertices.
    hex_vertices = get_hexagon_vertices(hex_center, hex_radius, hex_rotation, num_sides)

    # Update each ball.
    for ball in balls:
        ball.update(dt)

        # Check collision with each edge of the hexagon.
        for i in range(num_sides):
            # Get endpoints for the current edge.
            p1 = hex_vertices[i]
            p2 = hex_vertices[(i + 1) % num_sides]

            # Find the closest point on this edge to the ball.
            closest = project_point_on_segment(ball.pos, p1, p2)
            displacement = ball.pos - closest
            distance = displacement.length()

            if distance < ball.radius:
                # There is penetration.
                if distance != 0:
                    normal = displacement.normalize()
                else:
                    # If ball center is exactly on the edge, compute an edge normal.
                    edge = p2 - p1
                    normal = pygame.Vector2(-edge.y, edge.x).normalize()

                # Ensure the normal points inward.
                edge_mid = (p1 + p2) / 2
                to_center = (hex_center - edge_mid).normalize()
                if normal.dot(to_center) < 0:
                    normal = -normal

                # Correct penetration.
                penetration_depth = ball.radius - distance
                ball.pos += normal * penetration_depth

                # Determine the wall's velocity at the collision point.
                v_wall = wall_velocity_at_point(closest, hex_center, angular_velocity)
                # Relative velocity.
                rel_vel = ball.vel - v_wall

                # Decompose into normal and tangential components.
                vn = rel_vel.dot(normal)
                vt = rel_vel - vn * normal

                # Only reflect if the ball is moving toward the wall.
                if vn < 0:
                    new_rel_vel = -restitution * vn * normal + wall_friction * vt
                    ball.vel = new_rel_vel + v_wall

    # Clear screen.
    screen.fill(BLACK)

    # Draw hexagon.
    pygame.draw.polygon(screen, HEX_COLOR, [(v.x, v.y) for v in hex_vertices], width=3)

    # Draw all balls.
    for ball in balls:
        ball.draw(screen)

    # Flip display.
    pygame.display.flip()

pygame.quit()
sys.exit()