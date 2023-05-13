import { CapSonar } from './CapSonar.js';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  AccountUpdate
} from 'snarkyjs';
import { readFileSync, writeFileSync } from 'fs';

await isReady;

console.log('SnarkyJS loaded');

const useProof = false;

const Local = Mina.LocalBlockchain({ proofsEnabled: useProof });
Mina.setActiveInstance(Local);
const { privateKey: deployerKey, publicKey: deployerAccount } =
  Local.testAccounts[0];
const { privateKey: senderKey, publicKey: senderAccount } =
  Local.testAccounts[1];


const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();

// await fetchAccount(zkAppAddress);

const zkAppInstance = new CapSonar(zkAppAddress);
import promptSync from 'prompt-sync';
const prompt = promptSync({sigint: true});

let P1_salt = Field.random();
let P2_salt = Field.random();

let username = prompt('Type in a username to save your score: ');

let size = prompt('What is the size of the board: ');
size = Number(size);

let health = prompt('How much is health points does each player start with: ');
health = Number(health);

//initialize the game, Mina protocol
let P1x;
let P1y;
while (true) {
  P1x = prompt('What is your initial x coordinate: ');
  P1x = Number(P1x);
  P1y = prompt('What is your initial y coordinate: ');
  P1y = Number(P1y);
  if (P1x >= 0 && P1x < size && P1y >= 0 && P1y < size) {
    break;
  }
}

console.log("Intializing game...")

//Displaying the Leaderboard
console.log(' ');
console.log('Leaderboard:');
let leaderboardMap = new Map();
try {
  const mapString = readFileSync('leaderboard.txt', 'utf8');
  const parsedMap = JSON.parse(mapString);
  leaderboardMap = new Map(parsedMap);
  const sortedArray = [...leaderboardMap].sort((a, b) => a[0] < b[0] ? -1 : 1);
  for (const [key, value] of sortedArray) {
    console.log(`Username: ${key}, Timestep: ${value}`);
  }
} catch (err) {
  console.log("No existing leaderboard...");
}

const coords = P2_init_policy(size);
let P2x = Number(coords[0]);
let P2y = Number(coords[1]);

const two16 = 65536;
const deployTxn = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkAppInstance.deploy();
  zkAppInstance.init_board(size);
});
await deployTxn.prove();
await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();

const trans123 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.p1_init_position(P1_salt, Field(P1x), Field(P1y));
});
await trans123.prove();
await trans123.sign([senderKey]).send();

const trans1234 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.p2_init_position(P2_salt, Field(P2x), Field(P2y));
});
await trans1234.prove();
await trans1234.sign([senderKey]).send();

const valid_sub3 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.check_valid_pos(Field(P2x), Field(P2y));
});
await valid_sub3.prove();
await valid_sub3.sign([senderKey]).send();


function draw_current_board(curr_x, curr_y, size) {
  let board = [];
  //print the board to the console with the player's location making it visually appealing
  for (let i = size-1; i >= 0; i--) {
    let row = '';
    for (let j = 0; j < size; j++) {
      if (i == curr_y && j == curr_x) {
        row += 'X';
      } else {
        row += 'O';
      }
    }
    console.log(row);
  }
}

function player_move(direction, curr_x, curr_y) {
  let dx = 0;
  let dy = 0;
  if (direction == 1) {
    dy = 1;
  } else if (direction == 2) {
    dx = 1;
  } else if (direction == 3) {
    dy = -1;
  } else if (direction == 4) {
    dx = -1;
  }
  return [curr_x+dx, curr_y+dy];
}
const txn = await Mina.transaction(senderAccount, () => {
  zkAppInstance.init_health(Field(health));
});
await txn.prove();
await txn.sign([senderKey]).send();
console.log("");
console.log("Initial board:")
draw_current_board(P1x, P1y, size);
const p1health = Math.floor(zkAppInstance.P1P2health.get() / two16);
const p2health = zkAppInstance.P1P2health.get() % two16;
console.log("Player 1's health: ", p1health > health ? 0 : p1health);
console.log("Player 2's health: ", p2health > health ? 0 : p2health);
let timestep = 0;
while ((Math.floor(zkAppInstance.P1P2health.get() / two16) > 0 && Math.floor(zkAppInstance.P1P2health.get() / two16) <= health) && 
  (zkAppInstance.P1P2health.get() % two16 > 0 && zkAppInstance.P1P2health.get() % two16 <= health)) {
  console.log(' ');
  console.log('Timestep: ' + timestep);

  //-----Player 1 turn-----------------------------------------------
  const p1_attack_check = await Mina.transaction(senderAccount, () => {
    zkAppInstance.p1_check_if_attacked(Field(P1x), Field(P1y), P1_salt);
  });
  await p1_attack_check.prove();
  await p1_attack_check.sign([senderKey]).send();

  if (!(Math.floor(zkAppInstance.P1P2health.get() / two16) > 0 && Math.floor(zkAppInstance.P1P2health.get() / two16) <= health)) {
    const p1health = Math.floor(zkAppInstance.P1P2health.get() / two16);
    const p2health = zkAppInstance.P1P2health.get() % two16;
    console.log("Player 1's health: ", p1health > health ? 0 : p1health);
    console.log("Player 2's health: ", p2health > health ? 0 : p2health);
    break;
  }
  let new_P1_salt = Field.random();

  if (timestep % 2 == 0 && timestep != 0) {
    let p1_attack = prompt('Do you want to attack (Y/N): ');
    if (p1_attack == 'Y') {
      let x = prompt('What is the x coordinate of the attack: ');
      x = Number(x);
      let y = prompt('What is the y coordinate of the attack: ');
      y = Number(y);
      const txn3 = await Mina.transaction(senderAccount, () => {
        zkAppInstance.p1_attack_p2(Field(x), Field(y));
      });
      await txn3.prove();
      await txn3.sign([senderKey]).send();
    }
  } else if ((timestep - (zkAppInstance.P1P2_submerge_step.get() / two16)) > 4) {
    let p1_submerge = prompt('Do you want to submerge (Y/N): ');
    if (p1_submerge == 'Y') {
      let step1 = prompt('What is the first direction in the submerge: ');
      step1 = Number(step1);
      let step2 = prompt('What is the second direction in the submerge: ');
      step2 = Number(step2);
      const sub = await Mina.transaction(senderAccount, () => {
        zkAppInstance.p1_submerge(Field(P1x), Field(P1y), Field(step1), Field(step2), P1_salt);
      });
      await sub.prove();
      await sub.sign([senderKey]).send();
      if (zkAppInstance.P1P2_submerge_step.get() / two16 == timestep) {
        const coords_sub = player_move(step1, P1x, P1y);
        P1x = coords_sub[0];
        P1y = coords_sub[1];
        const coords_sub2 = player_move(step2, P1x, P1y);
        P1x = coords_sub2[0];
        P1y = coords_sub2[1];
        const valid_sub = await Mina.transaction(senderAccount, () => {
          zkAppInstance.check_valid_pos(Field(P1x), Field(P1y));
        });
        await valid_sub.prove();
        await valid_sub.sign([senderKey]).send();
      }
    }
  }
  let P1direction = prompt('Which direction do you want to travel (N=1, E=2, S=3, W=4): ');
  P1direction = Number(P1direction);
  const txn1 = await Mina.transaction(senderAccount, () => {
    zkAppInstance.update_p1_pos(Field(P1direction), Field(P1x), Field(P1y), P1_salt, new_P1_salt);
  });
  await txn1.prove();
  await txn1.sign([senderKey]).send();
  const coords1 = player_move(P1direction, P1x, P1y);
  P1x = coords1[0];
  P1y = coords1[1];
  P1_salt = new_P1_salt;
  //-----Player 1 End turn-------------------------------------------


  //-----Player 2 turn-----------------------------------------------
  const p2_attack_check = await Mina.transaction(senderAccount, () => {
    zkAppInstance.p2_check_if_attacked(Field(P2x), Field(P2y), P2_salt);
  });
  await p2_attack_check.prove();
  await p2_attack_check.sign([senderKey]).send();
  let new_P2_salt = Field.random();
  if (timestep % 2 == 0 && timestep != 0) { 
    const outputs = P2_action_policy(P2x, P2y, timestep);
    let p2_attack = outputs[0];
    let x2 = Number(outputs[1]);
    let y2 = Number(outputs[2]);
    if (p2_attack == 1) {
      console.log("Player 2 attack's: ","(", x2, ",", y2, ")");
      const txn4 = await Mina.transaction(senderAccount, () => {
        zkAppInstance.p2_attack_p1(Field(x2), Field(y2));
      });
      await txn4.prove();
      await txn4.sign([senderKey]).send();
    }
  } else if ((timestep - (zkAppInstance.P1P2_submerge_step.get() / two16)) > 4) {
    const coords = P2_submerge_policy(P2x, P2y);
    const p2_submerge = coords[0];
    const step1 = coords[1];
    const step2 = coords[2];
    if (p2_submerge == 'Y') {
      const sub = await Mina.transaction(senderAccount, () => {
        zkAppInstance.p2_submerge(Field(P2x), Field(P2y), Field(step1), Field(step2), P2_salt);
      });
      await sub.prove();
      await sub.sign([senderKey]).send();
      if (zkAppInstance.P1P2_submerge_step.get() / two16 == timestep) {
        const coords_sub = player_move(step1, P2x, P2y);
        P2x = coords_sub[0];
        P2y = coords_sub[1];
        const coords_sub2 = player_move(step2, P2x, P2y);
        P2x = coords_sub2[0];
        P2y = coords_sub2[1];
        const valid_sub = await Mina.transaction(senderAccount, () => {
          zkAppInstance.check_valid_pos(Field(P2x), Field(P2y));
        });
        await valid_sub.prove();
        await valid_sub.sign([senderKey]).send();
        console.log("Player 2 submerged!");
      }
    }
  }
  let P2direction = P2_move_policy(P2x, P2y, size);
  P2direction = Number(P2direction);
  const txn2 = await Mina.transaction(senderAccount, () => {
    zkAppInstance.update_p2_pos(Field(P2direction), Field(P2x), Field(P2y), P2_salt, new_P2_salt);
  });
  await txn2.prove();
  await txn2.sign([senderKey]).send();
  const coords2 = player_move(P2direction, P2x, P2y);
  P2x = coords2[0];
  P2y = coords2[1];
  console.log('Player 2 moved ' + P2direction);
  // console.log('Player 2 position: ' + P2x + ', ' + P2y);
  P2_salt = new_P2_salt;
  //-----Player 2 End turn-------------------------------------------


  //-----End of Turn Functions---------------------------------------
  const step_txn = await Mina.transaction(senderAccount, () => {
    zkAppInstance.increment_step();
  });
  await step_txn.prove();
  await step_txn.sign([senderKey]).send();
  draw_current_board(P1x, P1y, size);
  const p1health = Math.floor(zkAppInstance.P1P2health.get() / two16);
  const p2health = zkAppInstance.P1P2health.get() % two16;
  console.log("Player 1's health: ", p1health > health ? 0 : p1health);
  console.log("Player 2's health: ", p2health > health ? 0 : p2health);
  timestep += 1;
}


//Saving leaderboard
if (!leaderboardMap.has(username) || (leaderboardMap.has(username) && leaderboardMap.get(username) > timestep)) {
  leaderboardMap.set(username, timestep);
}

let mapString = JSON.stringify([...leaderboardMap]);
writeFileSync("leaderboard.txt", mapString, (err) => {
  if (err) {
    console.log('Error saving leaderboard!');
  } else {
    console.log('Leaderboard has been saved!');
  }
});
const finalp1health = Math.floor(zkAppInstance.P1P2health.get() / two16);

if (finalp1health > 0 && finalp1health <= health) {
  console.log('Player 1 wins!');
} else {
  console.log('Player 2 wins!');
}

console.log('Game over!');
await shutdown();


//-----Player 2 policies which can be changed by another user-----------

//Can be changed to make policy more complex
function P2_init_policy(size) {
  const P2x = Math.floor(Math.random() * size);
  const P2y = Math.floor(Math.random() * size);
  return [P2x, P2y];
}

//Can be changed to make policy more complex
function P2_move_policy(P2x, P2y, size) {
  let tempx = P2x;
  let tempy = P2y;
  let P2direction;
  let valid = true;
  while (valid) {
    P2direction = Math.floor(Math.random() * 4 + 1);
    const coords_sub = player_move(P2direction, tempx, tempy);
    tempx = coords_sub[0];
    tempy = coords_sub[1];
    if (tempx < size && tempx >= 0 && tempy < size && tempy >= 0) {
      valid = false;
    }
  }
  return P2direction;
}

//Currently P2x, P2y, step not used, but can be used to make policy more complex
function P2_action_policy(P2x, P2y, step) {
  const attack_x = Math.floor(Math.random() * size);
  const attack_y = Math.floor(Math.random() * size);
  return [Math.round(Math.random()), attack_x, attack_y];
}

//Currently P2x and P2y not used, but can be used to make policy more complex
function P2_submerge_policy(P2x, P2y) {
  const step1 = Math.floor(Math.random() * 4 + 1);
  const step2 = Math.floor(Math.random() * 4 + 1);
  return [Math.round(Math.random()), step1, step2];
}

