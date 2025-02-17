# Rogue like game

model: o3-mini

prompts:

use pygame to make a rogue like game

when I press space i should shoot the nearest enemy if it within 4 blocks away. make a little animation when that happen

great. now let the players move slowly by themself, and let them shoot you if they are within 2 squares distance. the game ends if they hit

when I get killed, it says game over for 5 seconds and then starts again, instead of shutting down.
spawn a new enemy each 5 seconds until there are 10 enemies.
make a counter on how many enemies has been shot.

make sure the shot counter gets reset each when the game restarts.
make a counter for how many shots the player has.
ensure the player never has more than 5 shots and cant shoot if there are zero left.
ensure the player gets a new shot each 4 seconds.


the player can shoot also if the enemy is out of range. in that case the ball just shoots in some random direction.
ensure all enemies can shoot for the first 5 seconds after they have spawned, and make them yellow until they can shoot

--


Change the parameters to this:

ENEMY_MOVE_DELAY = 500     # Enemies move every 1 second.
ENEMY_SHOOT_DELAY = 500    # Each enemy can shoot at most once per second.
ENEMY_SPAWN_DELAY = 2000    # Spawn a new enemy every 5 seconds (until there are 10)
GAME_OVER_DELAY = 4000      # 5 seconds pause on game over.
AMMO_REPLENISH_DELAY = 4000 # 1 new shot every 4 seconds.

Make green drops which give you 5 simultaneous shots in the direction of the enemy, but spread out over multiple tiles, but only subtract one shot at the counter



# Full prompt


create a rogue like game.

when the player press space it should shoot the nearest enemy if it within 4 blocks away. make a little animation when that happen.

let the players move slowly by themself, and let them shoot you if they are within 2 squares distance. the game ends if they hit.

when the player gets killed, it says game over for 5 seconds and then starts again, instead of shutting down.
spawn a new enemy each 5 seconds until there are 10 enemies.
make a counter on how many enemies has been shot.

make sure the shot counter gets reset each when the game restarts.
make a counter for how many shots the player has.
ensure the player never has more than 5 shots and cant shoot if there are zero left.
ensure the player gets a new shot each 4 seconds.

the player can shoot also if the enemy is out of range, and in that case the ball just shoots in some random direction.
ensure all enemies can shoot for the first 5 seconds after they have spawned, and make them yellow until they can shoot
