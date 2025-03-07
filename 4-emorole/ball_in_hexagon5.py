import pygame
import pymunk
import pymunk.pygame_util
import math
import random

def create_octagon(space, pos, radius, angular_velocity):
    """
    Creates a spinning octagon (a convex polygon with 8 sides) as a kinematic body.
    The octagon will spin at a constant angular velocity.
    """
    # Create a kinematic body whose motion is dictated by us (not by collisions)
    body = pymunk.Body(body_type=pymunk.Body.KINEMATIC)
    body.position = pos
    # Set a constant angular velocity (radians per second)
    body.angular_velocity = angular_velocity

    # Define vertices for a regular octagon (centered at (0,0))
    num_sides = 8
    vertices = []
    for i in range(num_sides):
        angle = 2 * math.pi * i / num_sides
        vertices.append((radius * math.cos(angle), radius * math.sin(angle)))
    
    shape = pymunk.Poly(body, vertices)
    shape.friction = 0.5
    shape.elasticity = 1.0
    space.add(body, shape)
    return body, shape

def create_ball(space, pos, radius):
    """
    Creates a dynamic ball with a given radius at a specified position.
    Mass is chosen proportional to the radius.
    """
    mass = radius
    moment = pymunk.moment_for_circle(mass, 0, radius)
    body = pymunk.Body(mass, moment)
    body.position = pos
    shape = pymunk.Circle(body, radius)
    shape.friction = 0.5
    shape.elasticity = 0.95  # near-elastic collisions
    space.add(body, shape)
    return body, shape

def main():
    pygame.init()
    width, height = 800, 600
    screen = pygame.display.set_mode((width, height))
    pygame.display.set_caption("10 Bouncing Balls in a Spinning Octagon")
    clock = pygame.time.Clock()

    # Set up the physics space with gravity
    space = pymunk.Space()
    space.gravity = (0, 900)  # Gravity pointing downward (pixels per second squared)
    space.damping = 0.99      # Global damping simulates friction

    # For drawing using Pymunk’s debug draw utility.
    draw_options = pymunk.pygame_util.DrawOptions(screen)

    # Create a spinning octagon in the center of the screen.
    octagon_radius = 250
    octagon_center = (width / 2, height / 2)
    octagon_angular_velocity = 0.5  # radians per second
    octagon_body, octagon_shape = create_octagon(space, octagon_center, octagon_radius, octagon_angular_velocity)

    # Create 10 balls with random sizes inside the octagon.
    balls = []
    for i in range(10):
        radius = random.randint(10, 30)
        # To ensure the ball starts inside the octagon, choose a random point inside a circle
        angle = random.uniform(0, 2 * math.pi)
        # Use octagon_radius minus the ball's radius (with a small margin) for placement.
        r = random.uniform(0, octagon_radius - radius - 5)
        pos = (octagon_center[0] + r * math.cos(angle), octagon_center[1] + r * math.sin(angle))
        ball = create_ball(space, pos, radius)
        balls.append(ball)

    running = True
    dt = 1.0 / 60.0  # simulation time step

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # Clear the screen.
        screen.fill((255, 255, 255))

        # Step the physics simulation.
        space.step(dt)

        # Draw all objects.
        space.debug_draw(draw_options)

        pygame.display.flip()
        clock.tick(60)

    pygame.quit()

if __name__ == '__main__':
    main()