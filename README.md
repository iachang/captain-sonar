# Mina zkApp: Captain Sonar

This template uses TypeScript.

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

# Instructions for the Game:
## Overview
This game is like moving battleships. Player 1 uses the terminal to move their submarine N, E, S, W at each step. Every 2 steps they can attack the enemy submarine. The Player 2 submarine is indicating which of the cardinal directions it has taken at each step but does not indicate its starting position. At every step of the game Player 1 moves their own submarine and tries to determine where the Player 2 submarine is using the Player 2 directions as clues. Here the Player 2 is a CPU with a hardcoded policy. People can very easily modify the game loop to create other Player 2 policies to beat their friends. 

Possible Actions: Move, Attack (Every 2 steps), Submerge (Every at least 10 steps)

## Goal
Shoot the Player 2 submarine down in the minimum amount of steps.

## Detailed Instructions
1. Select a username: "Type in a username to save your score:"
2. Indicate the size of the board for the game: "What is the size of the board:"
3. How many health points should each player start out with: "How much is health points does each player start with:"
4. Determine starting location of submarine: "What is your initial x coordinate:" and "What is your initial y coordinate:"
5. A leaderboard will show the usernames with the min steps to beat the Player 2 policy
6. An initial board will show up with the initial position of your submarine. The bottom left is (0, 0) and the board is 0 indexed. The "O" represent cells with empty water and the "X" represent the position of the submarine. The players' initial health is shown below the board.
7. At each timestep, we type in an integer for one of the cardinal directions for the following question: "Which direction do you want to travel (N=1, E=2, S=3, W=4):"
8. Every 2 timesteps, Player 1 will indicate whether they want to attack Player 2 and what is the X and Y position they want to attack.
9. At the start of the next turn if it was a direct hit the other player's health will drop by 2, if they were within 1 Manhattan distance then it will drop by 1.
10. If the other player has honed in on your position, then every at least 10 steps you can use the submerge ability where you will type in one integer for step 1 (N=1, E=2, S=3, W=4) and one integer for step 2. The other player will not see the directions you took, so this confuse the other player.
11. The game is over when either player has 0 health.



## License
[Apache-2.0](LICENSE)
