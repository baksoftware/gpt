import pygame
import sys
import random
import collections

# ======================
# Configuration Settings
# ======================
CELL_SIZE = 20             # Size of each grid cell in pixels
GRID_WIDTH = 30            # Number of cells horizontally
GRID_HEIGHT = 20           # Number of cells vertically
WIDTH = CELL_SIZE * GRID_WIDTH
HEIGHT = CELL_SIZE * GRID_HEIGHT

# Colors (R, G, B)
BLACK = (0, 0, 0)
GREEN = (0, 255, 0)
RED   = (255, 0, 0)
WHITE = (255, 255, 255)

# =====================
# Initialize Pygame
# =====================
pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Self-Playing Snake Game with Scoring")
clock = pygame.time.Clock()

# Set up the font for displaying the score.
font = pygame.font.SysFont("Arial", 24)

# ========================================
# Game State: Snake, Fruit, and Scoring
# ========================================
# The snake is represented as a list of (x, y) positions.
# The head is the first element.
snake = [(GRID_WIDTH // 2, GRID_HEIGHT // 2)]
# Start moving to the right (this will be updated by the AI)
direction = (1, 0)
fruit = None
score = 0  # Initialize score

def place_fruit():
    """Place fruit at a random position that is not on the snake."""
    while True:
        pos = (random.randint(0, GRID_WIDTH - 1), random.randint(0, GRID_HEIGHT - 1))
        if pos not in snake:
            return pos

fruit = place_fruit()

# =====================================
# Helper Functions for Pathfinding
# =====================================
def get_neighbors(pos):
    """Return neighboring grid positions (up, down, left, right)."""
    x, y = pos
    return [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]

def bfs(start, goal, snake_body):
    """
    Breadth-first search from start to goal.
    For the purpose of path planning we treat almost all snake body segments
    as obstacles, except we allow the tail cell (since it will move in the next step).
    """
    # Exclude the tail (last segment) from obstacles.
    obstacles = set(snake_body[1:-1])  # all segments except head and tail
    queue = collections.deque()
    queue.append(start)
    came_from = {start: None}
    while queue:
        current = queue.popleft()
        if current == goal:
            # Reconstruct the path from start to goal.
            path = []
            while current != start:
                path.append(current)
                current = came_from[current]
            path.reverse()
            return path
        for neighbor in get_neighbors(current):
            if (0 <= neighbor[0] < GRID_WIDTH and 0 <= neighbor[1] < GRID_HEIGHT and
                    neighbor not in obstacles and neighbor not in came_from):
                came_from[neighbor] = current
                queue.append(neighbor)
    return None

def is_safe(move, snake_body):
    """
    Given a move (dx, dy), check if moving the head in that direction is safe.
    A move is safe if it does not hit a wall or the snake’s body. We allow moving into
    the cell occupied by the tail because that cell will be freed unless the snake eats.
    """
    new_head = (snake_body[0][0] + move[0], snake_body[0][1] + move[1])
    # Check boundaries:
    if not (0 <= new_head[0] < GRID_WIDTH and 0 <= new_head[1] < GRID_HEIGHT):
        return False
    # Check for collision with the body.
    # (Allow new_head to be the tail because that cell will be removed unless the snake eats fruit.)
    if new_head in snake_body[1:]:
        if snake_body and new_head == snake_body[-1]:
            return True
        return False
    return True

def get_safe_move(snake_body, current_dir):
    """If no clear path to the fruit is available, return any safe move (prioritizing the current direction)."""
    possible_moves = [(1,0), (-1,0), (0,1), (0,-1)]
    if is_safe(current_dir, snake_body):
        return current_dir
    for move in possible_moves:
        if is_safe(move, snake_body):
            return move
    # If no safe move exists, return the current direction (game over soon)
    return current_dir

def get_next_direction(snake_body, fruit_pos, current_dir):
    """
    Decide on the next move:
      1. Try to find a path from the snake head to the fruit.
      2. If a path is found, return the first step in that path.
      3. Otherwise, try to move toward the tail (a safe strategy).
      4. If all else fails, choose any safe move.
    """
    path = bfs(snake_body[0], fruit_pos, snake_body)
    if path and len(path) > 0:
        next_cell = path[0]
        head = snake_body[0]
        move = (next_cell[0] - head[0], next_cell[1] - head[1])
        if is_safe(move, snake_body):
            return move
    # Try to move toward the tail if fruit isn’t reachable.
    tail = snake_body[-1]
    path_to_tail = bfs(snake_body[0], tail, snake_body)
    if path_to_tail and len(path_to_tail) > 0:
        next_cell = path_to_tail[0]
        move = (next_cell[0] - snake_body[0][0], next_cell[1] - snake_body[0][1])
        if is_safe(move, snake_body):
            return move
    # Fall back: choose any safe move.
    return get_safe_move(snake_body, current_dir)

# ======================
# Drawing Function
# ======================
def draw():
    """Redraw the game screen: snake, fruit, and score."""
    screen.fill(BLACK)
    
    # Draw the snake segments.
    for segment in snake:
        rect = pygame.Rect(segment[0] * CELL_SIZE, segment[1] * CELL_SIZE, CELL_SIZE, CELL_SIZE)
        pygame.draw.rect(screen, GREEN, rect)
    
    # Draw the fruit.
    rect = pygame.Rect(fruit[0] * CELL_SIZE, fruit[1] * CELL_SIZE, CELL_SIZE, CELL_SIZE)
    pygame.draw.rect(screen, RED, rect)
    
    # Render and draw the score.
    score_text = font.render("Score: " + str(score), True, WHITE)
    screen.blit(score_text, (10, 10))
    
    pygame.display.update()

# ======================
# Main Game Loop
# ======================
game_over = False
while not game_over:
    # Handle quitting events.
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            pygame.quit()
            sys.exit()

    # Let the AI choose the next move.
    direction = get_next_direction(snake, fruit, direction)
    new_head = (snake[0][0] + direction[0], snake[0][1] + direction[1])
    
    # Check for collisions with walls.
    if not (0 <= new_head[0] < GRID_WIDTH and 0 <= new_head[1] < GRID_HEIGHT):
        print("Game Over! The snake hit the wall. Final score:", score)
        game_over = True
        continue
    # Check for collisions with itself.
    if new_head in snake[:-1]:  # Allow collision with the tail since it will move if not eating fruit.
        print("Game Over! The snake ran into itself. Final score:", score)
        game_over = True
        continue

    # Move the snake: add the new head.
    snake.insert(0, new_head)
    
    # If the snake eats the fruit, do not remove the tail (the snake grows) and increase score.
    if new_head == fruit:
        score += 1
        fruit = place_fruit()
    else:
        snake.pop()  # Remove the tail since the snake moved.

    draw()
    clock.tick(10)  # Adjust the speed (frames per second)

pygame.quit()