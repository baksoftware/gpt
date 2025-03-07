# I tried to onesho it, but it did not work:
# Write a python program that shows 10 balls with different 
# color and size, bouncing inside a spinning hexagon. The ball
#  should be affected by gravity and friction, and it must bounce
#  off the rotating walls and the other balls realistically.

import pygame, math, random, sys

# -------- Constants and Helper Functions --------

WIDTH, HEIGHT = 800, 600
FPS = 60

GRAVITY = 0.3         # Constant acceleration downward
AIR_DAMPING = 0.999   # Slight damping to simulate air friction
WALL_RESTITUTION = 0.9  # Energy loss when bouncing off walls
BALL_RESTITUTION = 0.95  # Energy loss on ball-ball collisions

def closest_point(point, a, b):
    """Return the closest point on line segment ab to point."""
    ap = point - a
    ab = b - a
    t = ap.dot(ab) / ab.dot(ab)
    t = max(0, min(1, t))
    return a + ab * t

# -------- Classes --------

class Ball:
    def __init__(self, pos, vel, radius, color):
        self.pos = pygame.math.Vector2(pos)
        self.vel = pygame.math.Vector2(vel)
        self.radius = radius
        self.color = color
        # mass proportional to area (could also use radius**3)
        self.mass = math.pi * (radius ** 2)
    
    def update(self):
        # Apply gravity
        self.vel.y += GRAVITY
        # Apply air damping (friction)
        self.vel *= AIR_DAMPING
        # Update position
        self.pos += self.vel

    def draw(self, surface):
        pygame.draw.circle(surface, self.color, (int(self.pos.x), int(self.pos.y)), self.radius)

class Hexagon:
    def __init__(self, center, radius, angle, angular_velocity):
        self.center = pygame.math.Vector2(center)
        self.radius = radius
        self.angle = angle  # current rotation (in radians)
        self.angular_velocity = angular_velocity
        self.vertices = []
        self.update_vertices()
    
    def update_vertices(self):
        """Compute the 6 vertices of the hexagon based on center, radius, and angle."""
        self.vertices = []
        for i in range(6):
            theta = math.radians(60 * i) + self.angle
            vertex = self.center + pygame.math.Vector2(math.cos(theta), math.sin(theta)) * self.radius
            self.vertices.append(vertex)
    
    def update(self):
        self.angle += self.angular_velocity
        self.update_vertices()
    
    def draw(self, surface):
        points = [(v.x, v.y) for v in self.vertices]
        pygame.draw.polygon(surface, (200, 200, 200), points, 3)  # draw as outline

    def get_edges(self):
        """Return a list of (start, end) pairs for the edges of the hexagon."""
        edges = []
        for i in range(len(self.vertices)):
            start = self.vertices[i]
            end = self.vertices[(i + 1) % len(self.vertices)]
            edges.append((start, end))
        return edges

# -------- Collision Handlers --------

def handle_ball_wall_collision(ball, hexagon):
    """
    For each edge of the hexagon, check if the ball overlaps it.
    If so, push the ball back and reflect its velocity.
    """
    for a, b in hexagon.get_edges():
        cp = closest_point(ball.pos, a, b)
        dist = (ball.pos - cp).length()
        if dist < ball.radius:
            # Avoid division by zero
            if dist == 0:
                normal = pygame.math.Vector2(random.uniform(-1, 1), random.uniform(-1, 1)).normalize()
            else:
                normal = (ball.pos - cp).normalize()
            # Push the ball so it is exactly touching the wall
            overlap = ball.radius - dist
            ball.pos += normal * overlap
            # Reflect the velocity with restitution
            v_dot_n = ball.vel.dot(normal)
            ball.vel = ball.vel - (1 + WALL_RESTITUTION) * v_dot_n * normal

def handle_ball_ball_collision(ball1, ball2):
    """
    Check if two balls are overlapping. If so, separate them and update their
    velocities using an elastic collision formula (with some energy loss).
    """
    delta = ball2.pos - ball1.pos
    dist = delta.length()
    min_dist = ball1.radius + ball2.radius
    if dist < min_dist and dist != 0:
        # Normal vector from ball1 to ball2
        normal = delta / dist

        # Separate the balls so they no longer overlap
        overlap = min_dist - dist
        total_mass = ball1.mass + ball2.mass
        # Move each ball in proportion to the other’s mass
        ball1.pos -= normal * (overlap * (ball2.mass / total_mass))
        ball2.pos += normal * (overlap * (ball1.mass / total_mass))

        # Relative velocity along the normal
        rel_vel = ball1.vel - ball2.vel
        vel_along_normal = rel_vel.dot(normal)

        # Only resolve if balls are moving towards each other
        if vel_along_normal > 0:
            return

        # Calculate impulse scalar (using restitution for energy loss)
        impulse = -(1 + BALL_RESTITUTION) * vel_along_normal
        impulse /= (1 / ball1.mass + 1 / ball2.mass)

        impulse_vec = impulse * normal
        ball1.vel += impulse_vec / ball1.mass
        ball2.vel -= impulse_vec / ball2.mass

# -------- Main Program --------

def main():
    pygame.init()
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("10 Bouncing Balls inside a Spinning Hexagon")
    clock = pygame.time.Clock()

    # Create a hexagon centered in the screen.
    hexagon = Hexagon(center=(WIDTH/2, HEIGHT/2), radius=250, angle=0, angular_velocity=0.01)

    balls = []
    for _ in range(10):
        # Random radius between 10 and 30 pixels.
        radius = random.randint(10, 30)
        # Random color
        color = (random.randint(50, 255), random.randint(50, 255), random.randint(50, 255))
        # Start near the center of the screen (ensure they start inside the hexagon).
        pos = (WIDTH/2 + random.uniform(-100, 100), HEIGHT/2 + random.uniform(-100, 100))
        # Random initial velocity
        vel = (random.uniform(-5, 5), random.uniform(-5, 5))
        ball = Ball(pos, vel, radius, color)
        balls.append(ball)

    running = True
    while running:
        clock.tick(FPS)

        # --- Event Handling ---
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # --- Update Simulation ---
        hexagon.update()
        for ball in balls:
            ball.update()
            # Bounce off the hexagon walls
            handle_ball_wall_collision(ball, hexagon)
        
        # Handle ball-ball collisions (check each pair once)
        for i in range(len(balls)):
            for j in range(i + 1, len(balls)):
                handle_ball_ball_collision(balls[i], balls[j])

        # --- Drawing ---
        screen.fill((30, 30, 30))
        hexagon.draw(screen)
        for ball in balls:
            ball.draw(screen)

        pygame.display.flip()

    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()