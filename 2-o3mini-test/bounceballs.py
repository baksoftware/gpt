import sys
import random
import numpy as np
import pygame
from pygame.locals import *
from OpenGL.GL import *
from OpenGL.GLU import *

# ----- Simulation Parameters -----
NUM_BALLS = 10
CONTAINER_RADIUS = 300.0
BALL_RADIUS = 20.0

# ----- Ball Class -----
class Ball:
    def __init__(self, pos, vel, r, color):
        self.pos = pos      # numpy array (3,)
        self.vel = vel      # numpy array (3,)
        self.r = r          # radius of the ball
        self.color = color  # (R, G, B) tuple with values 0-255

    def update(self):
        # Update position using current velocity.
        self.pos += self.vel

        # Collision with the container sphere.
        d = np.linalg.norm(self.pos)
        if d + self.r > CONTAINER_RADIUS:
            # Compute the normal (from the center to the ball's position)
            n = self.pos / d
            # Reflect the velocity if moving outward.
            dot = np.dot(self.vel, n)
            if dot > 0:
                self.vel -= 2 * dot * n
            # Correct the position so the ball remains inside.
            overlap = (d + self.r) - CONTAINER_RADIUS
            self.pos -= n * overlap

    def draw(self, quadric):
        glPushMatrix()
        glTranslatef(self.pos[0], self.pos[1], self.pos[2])
        # Convert the ball color from 0-255 to 0-1 range.
        r = self.color[0] / 255.0
        g = self.color[1] / 255.0
        b = self.color[2] / 255.0
        # Set the material properties so the ball appears shiny.
        # The ambient and diffuse colors come from the ball's color.
        glMaterialfv(GL_FRONT, GL_AMBIENT_AND_DIFFUSE, [r, g, b, 1.0])
        # Set a white specular highlight.
        glMaterialfv(GL_FRONT, GL_SPECULAR, [1.0, 1.0, 1.0, 1.0])
        # Increase shininess for a glossy effect.
        glMaterialf(GL_FRONT, GL_SHININESS, 24.0)
        # Draw the ball as a sphere.
        gluSphere(quadric, self.r, 32, 32)
        glPopMatrix()

# ----- Collision Handling -----
def handle_collisions(balls):
    n = len(balls)
    for i in range(n):
        for j in range(i + 1, n):
            ball1 = balls[i]
            ball2 = balls[j]
            delta = ball2.pos - ball1.pos
            d = np.linalg.norm(delta)
            min_dist = ball1.r + ball2.r
            if d < min_dist:
                # Avoid division by zero if the centers coincide.
                if d == 0:
                    d = 0.1
                    delta = np.array([random.uniform(-1, 1) for _ in range(3)])
                # Compute the collision normal.
                n_vec = delta / d
                # Relative velocity along the normal.
                rel_vel = ball1.vel - ball2.vel
                speed = np.dot(rel_vel, n_vec)
                # Only resolve if the balls are moving toward each other.
                if speed > 0:
                    impulse = n_vec * speed
                    ball1.vel -= impulse
                    ball2.vel += impulse
                # Separate overlapping balls.
                overlap = (min_dist - d) / 2
                ball1.pos -= n_vec * overlap
                ball2.pos += n_vec * overlap

# ----- Main Function -----
def main():
    pygame.init()
    display = (800, 800)
    pygame.display.set_mode(display, DOUBLEBUF | OPENGL)
    
    # Set up the perspective projection.
    gluPerspective(45, (display[0] / display[1]), 0.1, 2000.0)
    # Translate the camera back so the container is in view.
    glTranslatef(0.0, 0.0, -800)
    glEnable(GL_DEPTH_TEST)
    glEnable(GL_NORMALIZE)
    # glShadeModel(GL_SMOOTH)
    
    # Enable lighting.
    glEnable(GL_LIGHTING)
    glEnable(GL_LIGHT0)
    # Configure the light source.
    glLightfv(GL_LIGHT0, GL_POSITION, [0, 0, 600, 1.0])
    glLightfv(GL_LIGHT0, GL_AMBIENT, [0.1, 0.1, 0.1, 1.0])
    glLightfv(GL_LIGHT0, GL_DIFFUSE, [0.8, 0.8, 0.8, 1.0])
    glLightfv(GL_LIGHT0, GL_SPECULAR, [1.0, 1.0, 1.0, 1.0])
    
    # Create two GLU quadric objects: one for the container and one for drawing the balls.
    container_quad = gluNewQuadric()
    ball_quadric = gluNewQuadric()
    
    # Create the list of balls.
    balls = []
    for _ in range(NUM_BALLS):
        valid = False
        pos = None
        # Ensure the ball's starting position is entirely within the container.
        while not valid:
            pos = np.array([random.uniform(-CONTAINER_RADIUS, CONTAINER_RADIUS) for _ in range(3)])
            if np.linalg.norm(pos) < CONTAINER_RADIUS - BALL_RADIUS:
                valid = True
        # Generate a random 3D velocity.
        vel = np.random.randn(3)
        norm_vel = np.linalg.norm(vel)
        if norm_vel == 0:
            norm_vel = 1
        vel = vel / norm_vel * random.uniform(1, 3)
        # Pick a random color for the ball.
        color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
        balls.append(Ball(pos, vel, BALL_RADIUS, color))
    
    clock = pygame.time.Clock()
    angle = 0.0  # Rotation angle in degrees.

    # Main loop.
    running = True
    while running:
        # Event handling.
        for event in pygame.event.get():
            if event.type == QUIT:
                running = False
        
        # Clear the color and depth buffers.
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT)
        
        # Save the current transformation matrix.
        glPushMatrix()
        # Rotate the entire scene slowly around the Y axis.
        angle += 0.5  # degrees per frame.
        glRotatef(angle, 0, 1, 0)
        
        # Draw the container sphere in wireframe.
        # Temporarily disable lighting so the wireframe is drawn in pure white.
        glDisable(GL_LIGHTING)
        glColor3f(1, 1, 1)
        gluQuadricDrawStyle(container_quad, GLU_LINE)
        gluSphere(container_quad, CONTAINER_RADIUS, 32, 32)
        # Re-enable lighting for the shiny balls.
        glEnable(GL_LIGHTING)
        
        # First, handle collisions between balls.
        handle_collisions(balls)
        # Then update and draw each ball.
        for ball in balls:
            ball.update()
            ball.draw(ball_quadric)
        
        # Restore the transformation matrix.
        glPopMatrix()
        
        pygame.display.flip()
        clock.tick(60)  # Limit to 60 FPS.

    # Cleanup: delete the GLU quadric objects.
    gluDeleteQuadric(container_quad)
    gluDeleteQuadric(ball_quadric)
    pygame.quit()
    sys.exit()

if __name__ == '__main__':
    main()