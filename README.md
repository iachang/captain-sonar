# Mina zkApp: Captain Sonar

This template uses TypeScript.

## Prerequisites
NodeJS v16 and later (or NodeJS v14 using --experimental-wasm-threads)
NPM v6 and later
Git v2 and later

```sh
zk project captain-sonar
```
When it asks, "Create an accompanying UI project too?" Select "none"

```sh
cd captain-sonar
npm install -g zkapp-cli
npm install -g sync-prompt
git remote add origin https://github.com/iachang/captain-sonar.git
git pull
git reset --hard origin/main
```

## How to build

```sh
npm run build
```

## How to run tests

```sh
npm run test
npm run testw # watch mode
```

## How to run coverage

```sh
npm run coverage
```


## Additional Install
Run the following command to install sync prompting for the game:
```
npm install sync-prompt
```
First build the game with
```
npm run build
```
Then play the game by running game_loop.js
 ```
 node build/src/game_loop.js
 ```

# Instructions for the Game:
## Overview
This game is like moving battleships. Player 1 uses the terminal to move their submarine N, E, S, W at each step. Every 2 steps they can attack the enemy submarine. The Player 2 submarine is indicating which of the cardinal directions it has taken at each step but does not indicate its starting position. At every step of the game Player 1 moves their own submarine and tries to determine where the Player 2 submarine is using the Player 2 directions as clues. Here the Player 2 is a CPU with a hardcoded policy. People can very easily modify the game loop to create other Player 2 policies to beat their friends. 

Possible Actions: Move, Attack (Every 2 steps), Submerge (Every at least 4 steps)

## Goal
Shoot the Player 2 submarine down in the minimum amount of steps.

## Detailed Instructions
1. Select a username: "Type in a username to save your score:"
2. Indicate the size of the board for the game: "What is the size of the board:"
3. How many health points should each player start out with: "How much is health points does each player start with:"
4. Determine starting location of submarine: "What is your initial x coordinate:" and "What is your initial y coordinate:". This will repeadtly loop until a valid zero-indexed X and Y are given for Player 1 according to the board size
5. A leaderboard will show the usernames with the min steps to beat the Player 2 policy
6. An initial board will show up with the initial position of your submarine. The bottom left is (0, 0) and the board is zero-indexed. The "O" represent cells with empty water and the "X" represent the position of the submarine. The players' initial health is shown below the board.
7. At each timestep, we type in an integer for one of the cardinal directions for the following question: "Which direction do you want to travel (N=1, E=2, S=3, W=4):"
8. When Player 2 moves, there is a message on the terminal which indicates the direction that they moved (e.g. Player 2 moved 4 which means Player 2 moved West).
9. Every 2 timesteps, Player 1 will indicate whether they want to attack Player 2 and what is the X and Y position they want to attack.
10. When Player 2 attacks, there is a message on the terminal which indicates what the X and Y position that Player 2 attacked (e.g. Player 2 attack's:  1 2 which means that Player 2 attacked position (1, 2))
11. At the start of the next turn if it was a direct hit the other player's health will drop by 2, if they were within 1 Manhattan distance then it will drop by 1.
12. If the other player has honed in on your position, then every at least 4 steps you can use the submerge ability where you will type in one integer for step 1 (N=1, E=2, S=3, W=4) and one integer for step 2. The other player will not see the directions you took, so this confuse the other player.
13. The game is over when either player has 0 health.

## Important Tips
1. For quicker games start with a 3x3 board and practice visualizing the paths Player 2 is taking!
2. If Player 1 or Player 2 (the policy) break any rules of the game (e.g. moving off of the board, starting the submarine off of the board) then the game will have an Assertion Error and you will have to Cntrl+C and restart the game.

Thanks for playing! Please let us know if you have any issues!




## License
[Apache-2.0](LICENSE)
