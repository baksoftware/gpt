from vpython import *
import random

# Set up the scene
scene = canvas(title="Spinning Long Blue Velour Sofa", width=800, height=600, center=vector(0, 0, 0), background=color.white)

# Create a velour-like material
def velour_material():
    return materials.rough(color=vector(0, 0, random.uniform(0.5, 0.7)), opacity=1)

# Create the sofa parts (longer version)
base = box(pos=vector(0, -0.5, 0), size=vector(6, 1, 2), material=velour_material())
back = box(pos=vector(-2.5, 0.5, 0), size=vector(1, 2, 2), material=velour_material())
left_arm = box(pos=vector(0, 0, -1.25), size=vector(5, 1, 0.5), material=velour_material())
right_arm = box(pos=vector(0, 0, 1.25), size=vector(5, 1, 0.5), material=velour_material())

# Add some cushions
cushion1 = sphere(pos=vector(-1, 0.25, -0.5), size=vector(1.5, 0.5, 1), material=velour_material())
cushion2 = sphere(pos=vector(1, 0.25, -0.5), size=vector(1.5, 0.5, 1), material=velour_material())
cushion3 = sphere(pos=vector(-1, 0.25, 0.5), size=vector(1.5, 0.5, 1), material=velour_material())
cushion4 = sphere(pos=vector(1, 0.25, 0.5), size=vector(1.5, 0.5, 1), material=velour_material())

# Group all parts into a single compound object
sofa = compound([base, back, left_arm, right_arm, cushion1, cushion2, cushion3, cushion4])

# Set up rotation
angular_velocity = 0.5  # radians per second

# Animation loop
while True:
    rate(30)  # Limit the animation to 30 frames per second
    sofa.rotate(angle=angular_velocity * 1/30, axis=vector(0, 1, 0))