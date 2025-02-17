import pygame
import random
import math

# ----- Configuration -----
TILE_SIZE = 32
MAP_WIDTH = 25
MAP_HEIGHT = 18
SCREEN_WIDTH = TILE_SIZE * MAP_WIDTH
SCREEN_HEIGHT = TILE_SIZE * MAP_HEIGHT

# Colors (R, G, B)
COLOR_FLOOR = (200, 200, 200)
COLOR_WALL = (50, 50, 50)
COLOR_PLAYER = (0, 0, 255)
COLOR_ENEMY = (255, 0, 0)
COLOR_BULLET = (255, 255, 0)

# ----- Map Generation -----
def generate_map():
    """
    Create a dungeon map using a random-walk algorithm.
    The map is represented as a 2D list where:
      - 0 = floor (walkable)
      - 1 = wall (blocked)
    """
    # Start with a grid full of walls.
    map_data = [[1 for _ in range(MAP_WIDTH)] for _ in range(MAP_HEIGHT)]
    
    # Begin in the center of the map.
    x, y = MAP_WIDTH // 2, MAP_HEIGHT // 2
    map_data[y][x] = 0  # Carve out the starting cell as floor.

    # Carve out floors by taking a random walk.
    steps = 1500  # Adjust this value to create more or fewer floor tiles.
    for _ in range(steps):
        direction = random.choice(['up', 'down', 'left', 'right'])
        if direction == 'up' and y > 1:
            y -= 1
        elif direction == 'down' and y < MAP_HEIGHT - 2:
            y += 1
        elif direction == 'left' and x > 1:
            x -= 1
        elif direction == 'right' and x < MAP_WIDTH - 2:
            x += 1
        map_data[y][x] = 0

    return map_data

# ----- Game Entities -----
class Player:
    def __init__(self, x, y):
        self.x = x  # Tile coordinate
        self.y = y  # Tile coordinate

    def move(self, dx, dy, game_map):
        """Attempt to move the player by (dx, dy) if the target tile is walkable."""
        new_x = self.x + dx
        new_y = self.y + dy
        # Check boundaries.
        if 0 <= new_x < MAP_WIDTH and 0 <= new_y < MAP_HEIGHT:
            if game_map[new_y][new_x] == 0:  # Only move on floor tiles.
                self.x = new_x
                self.y = new_y

class Enemy:
    def __init__(self, x, y):
        self.x = x  # Tile coordinate
        self.y = y  # Tile coordinate

    def move_random(self, game_map):
        """Move the enemy in a random direction if the target tile is walkable."""
        directions = [(0, -1), (0, 1), (-1, 0), (1, 0)]
        random.shuffle(directions)
        for dx, dy in directions:
            new_x = self.x + dx
            new_y = self.y + dy
            if 0 <= new_x < MAP_WIDTH and 0 <= new_y < MAP_HEIGHT:
                if game_map[new_y][new_x] == 0:
                    self.x = new_x
                    self.y = new_y
                    break

class Bullet:
    def __init__(self, start_x, start_y, target, speed=8):
        """
        start_x, start_y are the pixel coordinates where the bullet starts.
        target is the Enemy object that was shot.
        speed is in pixels per frame.
        """
        self.x = start_x
        self.y = start_y
        self.target = target
        self.speed = speed
        # Calculate the target center position in pixel coordinates.
        target_center_x = target.x * TILE_SIZE + TILE_SIZE / 2
        target_center_y = target.y * TILE_SIZE + TILE_SIZE / 2
        dx = target_center_x - self.x
        dy = target_center_y - self.y
        distance = math.hypot(dx, dy)
        if distance != 0:
            self.dx = dx / distance * speed
            self.dy = dy / distance * speed
        else:
            self.dx = 0
            self.dy = 0

    def update(self):
        self.x += self.dx
        self.y += self.dy

    def has_hit_target(self):
        """
        Check if the bullet is close enough to the target's current center.
        """
        target_center_x = self.target.x * TILE_SIZE + TILE_SIZE / 2
        target_center_y = self.target.y * TILE_SIZE + TILE_SIZE / 2
        if math.hypot(self.x - target_center_x, self.y - target_center_y) < 8:
            return True
        return False

    def draw(self, screen):
        pygame.draw.circle(screen, COLOR_BULLET, (int(self.x), int(self.y)), 5)

def find_nearest_enemy(player, enemies, max_distance=4):
    """
    Find the enemy nearest to the player that is within max_distance (in tiles).
    Returns the enemy and the Euclidean distance; if none found, returns (None, None).
    """
    nearest_enemy = None
    nearest_dist = None
    for enemy in enemies:
        dx = enemy.x - player.x
        dy = enemy.y - player.y
        distance = math.hypot(dx, dy)
        if distance <= max_distance:
            if nearest_enemy is None or distance < nearest_dist:
                nearest_enemy = enemy
                nearest_dist = distance
    return nearest_enemy, nearest_dist

# ----- Main Game Loop -----
def main():
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Rogue-like Game with Shooting")
    clock = pygame.time.Clock()

    # Generate the dungeon map.
    game_map = generate_map()

    # Place the player. Start at the center; if it’s a wall, search for a floor tile.
    player = Player(MAP_WIDTH // 2, MAP_HEIGHT // 2)
    if game_map[player.y][player.x] == 1:
        for y in range(MAP_HEIGHT):
            for x in range(MAP_WIDTH):
                if game_map[y][x] == 0:
                    player.x = x
                    player.y = y
                    break
            else:
                continue
            break

    # Create a few enemies at random floor positions.
    enemies = []
    enemy_count = 5
    for _ in range(enemy_count):
        while True:
            ex = random.randint(0, MAP_WIDTH - 1)
            ey = random.randint(0, MAP_HEIGHT - 1)
            if game_map[ey][ex] == 0 and (ex != player.x or ey != player.y):
                enemies.append(Enemy(ex, ey))
                break

    # List to keep track of bullets in flight.
    bullets = []

    running = True
    while running:
        clock.tick(30)  # Increased FPS for smoother bullet animation.
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                dx, dy = 0, 0
                if event.key in (pygame.K_UP, pygame.K_w):
                    dy = -1
                elif event.key in (pygame.K_DOWN, pygame.K_s):
                    dy = 1
                elif event.key in (pygame.K_LEFT, pygame.K_a):
                    dx = -1
                elif event.key in (pygame.K_RIGHT, pygame.K_d):
                    dx = 1
                elif event.key == pygame.K_SPACE:
                    # When space is pressed, shoot the nearest enemy if within 4 tiles.
                    target_enemy, dist = find_nearest_enemy(player, enemies, max_distance=4)
                    if target_enemy:
                        # Create a bullet starting from the player's center (in pixels).
                        start_x = player.x * TILE_SIZE + TILE_SIZE / 2
                        start_y = player.y * TILE_SIZE + TILE_SIZE / 2
                        bullet = Bullet(start_x, start_y, target_enemy, speed=12)
                        bullets.append(bullet)

                if dx != 0 or dy != 0:
                    # Move the player if possible.
                    player.move(dx, dy, game_map)
                    # After the player moves, have each enemy take a random move.
                    for enemy in enemies:
                        enemy.move_random(game_map)

        # ----- Update Bullets -----
        for bullet in bullets[:]:
            bullet.update()
            # If the bullet hits its target and the target is still in the enemy list.
            if bullet.has_hit_target() and bullet.target in enemies:
                enemies.remove(bullet.target)
                bullets.remove(bullet)
            # Optionally, remove bullet if it goes off-screen.
            elif not (0 <= bullet.x <= SCREEN_WIDTH and 0 <= bullet.y <= SCREEN_HEIGHT):
                bullets.remove(bullet)

        # ----- Rendering -----
        # Draw the map.
        screen.fill((0, 0, 0))
        for y in range(MAP_HEIGHT):
            for x in range(MAP_WIDTH):
                rect = pygame.Rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
                if game_map[y][x] == 0:
                    pygame.draw.rect(screen, COLOR_FLOOR, rect)
                else:
                    pygame.draw.rect(screen, COLOR_WALL, rect)

        # Draw the player.
        player_rect = pygame.Rect(player.x * TILE_SIZE, player.y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        pygame.draw.rect(screen, COLOR_PLAYER, player_rect)

        # Draw the enemies.
        for enemy in enemies:
            enemy_rect = pygame.Rect(enemy.x * TILE_SIZE, enemy.y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            pygame.draw.rect(screen, COLOR_ENEMY, enemy_rect)

        # Draw bullets.
        for bullet in bullets:
            bullet.draw(screen)

        pygame.display.flip()

    pygame.quit()

if __name__ == "__main__":
    main()