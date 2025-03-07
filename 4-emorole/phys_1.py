import pygame
import pymunk
import pymunk.pygame_util


def create_car(space, position):
    """Create a rectangular car body and shape."""
    car_mass = 10
    car_width, car_height = 60, 30
    # Calculate moment of inertia for a box.
    car_moment = pymunk.moment_for_box(car_mass, (car_width, car_height))
    car_body = pymunk.Body(car_mass, car_moment)
    car_body.position = position
    car_shape = pymunk.Poly.create_box(car_body, (car_width, car_height))
    car_shape.friction = 0.5
    space.add(car_body, car_shape)
    return car_body, car_shape


def create_brick(space, position, size=(40, 20), mass=1):
    """Create a single brick."""
    brick_moment = pymunk.moment_for_box(mass, size)
    brick_body = pymunk.Body(mass, brick_moment)
    brick_body.position = position
    brick_shape = pymunk.Poly.create_box(brick_body, size)
    brick_shape.friction = 0.5
    space.add(brick_body, brick_shape)
    return brick_body, brick_shape


def create_wall(space, start_position, rows=5, cols=10, brick_size=(40, 20), gap=2):
    """Create a wall made of bricks."""
    bricks = []
    start_x, start_y = start_position
    for row in range(rows):
        for col in range(cols):
            x = start_x + col * (brick_size[0] + gap)
            y = start_y + row * (brick_size[1] + gap)
            brick = create_brick(space, (x, y), size=brick_size)
            bricks.append(brick)
    return bricks


def add_static_ground(space, screen_width):
    """Add a static ground segment to the simulation."""
    ground_y = 100
    ground = pymunk.Segment(space.static_body, (0, ground_y), (screen_width, ground_y), 5)
    ground.friction = 1.0
    space.add(ground)
    return ground


def main():
    pygame.init()
    screen_width, screen_height = 800, 600
    screen = pygame.display.set_mode((screen_width, screen_height))
    pygame.display.set_caption("Pymunk Car and Brick Wall Simulation")
    clock = pygame.time.Clock()

    # Set up the Pymunk space.
    space = pymunk.Space()
    space.gravity = (0, -900)  # gravity pointing downward

    add_static_ground(space, screen_width)

    # Create the car near the left side.
    car_position = (100, 140)
    car_body, car_shape = create_car(space, car_position)
    car_shape.color = (255, 0, 0)
    
    # Create a wall of bricks on the right side.
    wall_start = (400, 100)
    create_wall(space, wall_start, rows=7, cols=4, brick_size=(20, 10), gap=0.2)

    # Set up Pymunk's debug drawing using pygame_util.
    draw_options = pymunk.pygame_util.DrawOptions(screen)
    #
    # To flip the simulation so that Pymunk’s coordinate system (with positive y up)
    # matches Pygame’s coordinate system (with positive y down), we set:
    #
    #   x' = 1*x + 0*y + 0
    #   y' = 0*x + (-1)*y + screen_height
    #
    # That is, we create a transform with:
    #   a = 1, b = 0, c = 0, d = -1, tx = 0, ty = screen_height
    #
    draw_options.transform = pymunk.Transform(1, 0, 0, -1, 0, screen_height)

    # Define the continuous force to simulate the engine.
    engine_force = 10000

    running = True
    while running:
        # Process events.
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

        # Apply continuous force to the car.
        car_body.apply_force_at_local_point((engine_force, 0))

        # Clear the screen.
        screen.fill((255, 255, 255))
        # Draw the simulation.
        space.debug_draw(draw_options)
        pygame.display.flip()

        # Step the simulation.
        dt = 1.0 / 50.0
        space.step(dt)
        clock.tick(50)

    pygame.quit()


if __name__ == "__main__":
    main()