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
COLOR_ENEMY = (255, 0, 0)             # Enemy ready-to-shoot (red)
COLOR_ENEMY_NOT_READY = (255, 255, 0)   # Enemy not ready to shoot (yellow)
COLOR_BULLET_PLAYER = (255, 255, 0)     # Bullet shot by player
COLOR_BULLET_ENEMY = (255, 100, 0)      # Bullet shot by enemy
COLOR_TEXT = (255, 255, 255)

# Timers (in milliseconds)
ENEMY_MOVE_DELAY = 500     # Enemies move every 1 second.
ENEMY_SHOOT_DELAY = 500    # Each enemy can shoot at most once per second.
ENEMY_SPAWN_DELAY = 2000    # Spawn a new enemy every 5 seconds (until there are 10)
GAME_OVER_DELAY = 4000      # 5 seconds pause on game over.
AMMO_REPLENISH_DELAY = 4000 # 1 new shot every 4 seconds.
MAX_AMMO = 5

# The warm-up time (in milliseconds) before an enemy can shoot.
ENEMY_WARMUP = 3000

# ----- Map Generation -----
def generate_map():
    """
    Create a dungeon map using a random-walk algorithm.
    The map is represented as a 2D list where:
      - 0 = floor (walkable)
      - 1 = wall (blocked)
    """
    map_data = [[1 for _ in range(MAP_WIDTH)] for _ in range(MAP_HEIGHT)]
    x, y = MAP_WIDTH // 2, MAP_HEIGHT // 2
    map_data[y][x] = 0  # Start here

    steps = 1500
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
        new_x = self.x + dx
        new_y = self.y + dy
        if 0 <= new_x < MAP_WIDTH and 0 <= new_y < MAP_HEIGHT:
            if game_map[new_y][new_x] == 0:
                self.x = new_x
                self.y = new_y

    def center(self):
        return (self.x * TILE_SIZE + TILE_SIZE / 2,
                self.y * TILE_SIZE + TILE_SIZE / 2)

class Enemy:
    def __init__(self, x, y):
        self.x = x  # Tile coordinate
        self.y = y  # Tile coordinate
        self.last_shot = 0  # Timestamp (ms) of last shot
        self.spawn_time = pygame.time.get_ticks()  # Record spawn time

    def move_random(self, game_map):
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

    def center(self):
        return (self.x * TILE_SIZE + TILE_SIZE / 2,
                self.y * TILE_SIZE + TILE_SIZE / 2)

class Bullet:
    def __init__(self, start_x, start_y, target, speed=8, color=COLOR_BULLET_PLAYER):
        """
        If target is not None, bullet calculates a velocity vector toward target.center().
        If target is None, bullet chooses a random direction.
        """
        self.x = start_x
        self.y = start_y
        self.speed = speed
        self.color = color
        self.target = target  # target is an object with center() method, or None

        if self.target is None:
            # Choose a random angle
            angle = random.uniform(0, 2 * math.pi)
            self.dx = math.cos(angle) * speed
            self.dy = math.sin(angle) * speed
        else:
            target_center = self.target.center()
            dx = target_center[0] - self.x
            dy = target_center[1] - self.y
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
        If target exists, check if bullet is near its current center.
        Otherwise, return False (bullet will be removed when off-screen).
        """
        if self.target is None:
            return False
        target_center = self.target.center()
        return math.hypot(self.x - target_center[0], self.y - target_center[1]) < 8

    def draw(self, screen):
        pygame.draw.circle(screen, self.color, (int(self.x), int(self.y)), 5)

def find_nearest_enemy(player, enemies, max_distance=4):
    """
    Returns the nearest enemy (within max_distance in tiles) to the player.
    If none found, returns (None, None).
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
def run_game():
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Rogue-like: Enemies Shoot You!")
    clock = pygame.time.Clock()
    hud_font = pygame.font.SysFont(None, 24)

    # Generate the map.
    game_map = generate_map()

    # Create the player.
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

    # Create initial enemies.
    enemies = []
    enemy_count_initial = 5
    while len(enemies) < enemy_count_initial:
        ex = random.randint(0, MAP_WIDTH - 1)
        ey = random.randint(0, MAP_HEIGHT - 1)
        if game_map[ey][ex] == 0 and (ex != player.x or ey != player.y):
            enemies.append(Enemy(ex, ey))

    # Bullets lists.
    player_bullets = []
    enemy_bullets = []

    # --- New Counters and Timers ---
    score = 0                # Enemies shot counter (kill counter)
    player_ammo = MAX_AMMO   # Player starts with maximum ammo (5 shots)
    last_ammo_replenish = pygame.time.get_ticks()  # For ammo replenishment

    # Timers.
    last_enemy_move_time = pygame.time.get_ticks()
    last_enemy_spawn_time = pygame.time.get_ticks()

    running = True
    game_over = False

    while running:
        dt = clock.tick(30)
        current_time = pygame.time.get_ticks()

        # --- Replenish Ammo ---
        if current_time - last_ammo_replenish >= AMMO_REPLENISH_DELAY:
            if player_ammo < MAX_AMMO:
                player_ammo += 1
            last_ammo_replenish = current_time

        # --- Event Handling ---
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
                game_over = True
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
                    # Shoot a bullet if ammo is available.
                    if player_ammo > 0:
                        # Try to find the nearest enemy within 4 tiles.
                        target_enemy, _ = find_nearest_enemy(player, enemies, max_distance=4)
                        # If no enemy in range, fire in a random direction.
                        bullet = Bullet(player.center()[0], player.center()[1],
                                        target=target_enemy, speed=12,
                                        color=COLOR_BULLET_PLAYER)
                        player_bullets.append(bullet)
                        player_ammo -= 1
                if dx != 0 or dy != 0:
                    player.move(dx, dy, game_map)

        # --- Enemy Autonomous Behavior ---
        if current_time - last_enemy_move_time >= ENEMY_MOVE_DELAY:
            for enemy in enemies:
                enemy.move_random(game_map)
            last_enemy_move_time = current_time

        # Each enemy shoots if the player is within 2 tiles AND the enemy is past its warm-up.
        for enemy in enemies:
            # Only allow shooting if the enemy has been alive for at least ENEMY_WARMUP.
            if current_time - enemy.spawn_time >= ENEMY_WARMUP:
                dx = enemy.x - player.x
                dy = enemy.y - player.y
                if math.hypot(dx, dy) <= 2:
                    if current_time - enemy.last_shot >= ENEMY_SHOOT_DELAY:
                        ex, ey = enemy.center()
                        bullet = Bullet(ex, ey, player, speed=8, color=COLOR_BULLET_ENEMY)
                        enemy_bullets.append(bullet)
                        enemy.last_shot = current_time

        # Spawn a new enemy every ENEMY_SPAWN_DELAY (up to 10 enemies).
        if current_time - last_enemy_spawn_time >= ENEMY_SPAWN_DELAY:
            if len(enemies) < 10:
                for _ in range(20):
                    ex = random.randint(0, MAP_WIDTH - 1)
                    ey = random.randint(0, MAP_HEIGHT - 1)
                    if game_map[ey][ex] == 0 and (ex != player.x or ey != player.y):
                        enemies.append(Enemy(ex, ey))
                        break
            last_enemy_spawn_time = current_time

        # --- Update Bullets ---
        for bullet in player_bullets[:]:
            bullet.update()
            if bullet.has_hit_target() and bullet.target in enemies:
                enemies.remove(bullet.target)
                if bullet in player_bullets:
                    player_bullets.remove(bullet)
                score += 1  # Increase the enemy kill counter.
            elif not (0 <= bullet.x <= SCREEN_WIDTH and 0 <= bullet.y <= SCREEN_HEIGHT):
                if bullet in player_bullets:
                    player_bullets.remove(bullet)

        for bullet in enemy_bullets[:]:
            bullet.update()
            if bullet.has_hit_target():
                game_over = True
                running = False
            elif not (0 <= bullet.x <= SCREEN_WIDTH and 0 <= bullet.y <= SCREEN_HEIGHT):
                enemy_bullets.remove(bullet)

        # --- Rendering ---
        screen.fill((0, 0, 0))
        # Draw the map.
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

        # Draw the enemies. Use yellow if they are still in their warm-up period.
        for enemy in enemies:
            enemy_color = COLOR_ENEMY_NOT_READY if current_time - enemy.spawn_time < ENEMY_WARMUP else COLOR_ENEMY
            enemy_rect = pygame.Rect(enemy.x * TILE_SIZE, enemy.y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
            pygame.draw.rect(screen, enemy_color, enemy_rect)

        # Draw bullets.
        for bullet in player_bullets:
            bullet.draw(screen)
        for bullet in enemy_bullets:
            bullet.draw(screen)

        # Draw HUD: Kill counter and Ammo counter.
        score_text = hud_font.render(f"Enemies Shot: {score}", True, COLOR_TEXT)
        ammo_text = hud_font.render(f"Shots: {player_ammo}", True, COLOR_TEXT)
        screen.blit(score_text, (10, 10))
        screen.blit(ammo_text, (10, 30))

        pygame.display.flip()

    return score

def main():
    while True:
        run_game()

        # Display Game Over screen for GAME_OVER_DELAY milliseconds.
        pygame.init()
        screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("Game Over")
        font = pygame.font.SysFont(None, 48)
        hud_font = pygame.font.SysFont(None, 32)
        clock = pygame.time.Clock()

        game_over_start = pygame.time.get_ticks()
        while pygame.time.get_ticks() - game_over_start < GAME_OVER_DELAY:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    return
            screen.fill((0, 0, 0))
            text = font.render("Game Over!", True, (255, 0, 0))
            text_rect = text.get_rect(center=(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2))
            screen.blit(text, text_rect)
            info_text = hud_font.render("Restarting game...", True, COLOR_TEXT)
            info_rect = info_text.get_rect(center=(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2 + 50))
            screen.blit(info_text, info_rect)
            pygame.display.flip()
            clock.tick(30)

if __name__ == "__main__":
    main()