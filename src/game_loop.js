import { CapSonar } from './CapSonar.js';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  Poseidon,
  Character,
  AccountUpdate,
  fetchAccount
} from 'snarkyjs';

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

let size = prompt('What is the size of the board: ');
size = Number(size);

let health = prompt('How much is health points does each player start with: ');
health = Number(health);

//initialize the game, Mina protocol

let P1x = prompt('What is your initial x coordinate: ');
P1x = Number(P1x);
let P1y = prompt('What is your initial y coordinate: ');
P1y = Number(P1y);

const coords = P2_init_policy(size);
let P2x = Number(coords[0]);
let P2y = Number(coords[1]);

let P1health = health;
let P2health = health;

const two16 = 65536;
const deployTxn = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkAppInstance.deploy();
  zkAppInstance.p1_init_position(P1_salt, Field(P1x), Field(P1y));
  zkAppInstance.p2_init_position(P2_salt, Field(P2x), Field(P2y));
  zkAppInstance.init_board(size);
});
await deployTxn.prove();
await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();



// write a function that draws a board in the terminal and display an X to depict the player's location
// the board is a 2D array of size x size
function draw_current_board(curr_x, curr_y, size) {
  let board = [];
  //print the board to the console with the player's location making it visually appealing
  for (let i = 0; i < size; i++) {
    let row = '';
    for (let j = 0; j < size; j++) {
      if (i == size-curr_y && j == curr_x) {
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

console.log("Initial board:")
draw_current_board(P1x, P1y, size);
console.log("Player 1's health: " + Math.floor(zkAppInstance.P1P2health.get() / two16));
console.log("Player 2's health: " + zkAppInstance.P1P2health.get() % two16);
let timestep = 0;
while (P1health > 0 && P2health > 0) {
  console.log(' ');
  console.log('Timestep: ' + timestep);

  //-----Player 1 turn-----------------------------------------------
  const p1_attack_check = await Mina.transaction(senderAccount, () => {
    zkAppInstance.p1_check_if_attacked(Field(P1x), Field(P1y), P1_salt);
  });
  await p1_attack_check.prove();
  await p1_attack_check.sign([senderKey]).send();
  console.log("Done checking if player 1 was attacked");
  if (timestep % 2 == 0) { //&& timestep != 0
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
  }
  let P1direction = prompt('Which direction do you want to travel (N=1, E=2, S=3, W=4): ');
  P1direction = Number(P1direction);
  const txn1 = await Mina.transaction(senderAccount, () => {
    zkAppInstance.update_p1_pos(Field(P1direction), Field(P1x), Field(P1y), P1_salt);
  });
  await txn1.prove();
  await txn1.sign([senderKey]).send();
  const coords1 = player_move(P1direction, P1x, P1y);
  P1x = coords1[0];
  P1y = coords1[1];
  // console.log("total health:", zkAppInstance.P1P2health.get(),
  //  " p1 p2 attack:", zkAppInstance.P1P2attacked.get(), 
  //  " p2 attacked at pos:", zkAppInstance.P2attackedatXY.get(),
  //  " p2 pos:", zkAppInstance.P2_pos.get()
  // );
  //-----Player 1 End turn-------------------------------------------


  //-----Player 2 turn-----------------------------------------------
  const p2_attack_check = await Mina.transaction(senderAccount, () => {
    zkAppInstance.p2_check_if_attacked(Field(P2x), Field(P2y), P2_salt);
  });
  await p2_attack_check.prove();
  await p2_attack_check.sign([senderKey]).send();
  if (timestep % 2 == 0) { //&& timestep != 0
    const outputs = P2_action_policy(P2x, P2y, timestep);
    let p2_attack = outputs[0];
    let x2 = Number(outputs[1]);
    let y2 = Number(outputs[2]);
    console.log("p2_attack: ", p2_attack, x2, y2)
    if (p2_attack == 1) {
      const txn4 = await Mina.transaction(senderAccount, () => {
        zkAppInstance.p2_attack_p1(Field(x2), Field(y2));
      });
      await txn4.prove();
      await txn4.sign([senderKey]).send();
    }
  }
  let P2direction = P2_move_policy(P2x, P2y);
  P2direction = Number(P2direction);

  const txn2 = await Mina.transaction(senderAccount, () => {
    zkAppInstance.update_p2_pos(Field(P2direction), Field(P2x), Field(P2y), P2_salt);
  });
  await txn2.prove();
  await txn2.sign([senderKey]).send();
  const coords2 = player_move(P2direction, P2x, P2y);
  P2x = coords2[0];
  P2y = coords2[1];
  console.log('Player 2 moved ' + P2direction);
  console.log('Player 2 position: ' + P2x + ', ' + P2y);
  //-----Player 2 End turn-------------------------------------------

  draw_current_board(P1x, P1y, size);
  console.log("Player 1's health: " + Math.floor(zkAppInstance.P1P2health.get() / two16));
  console.log("Player 2's health: " + zkAppInstance.P1P2health.get() % two16);
  timestep += 1;
}

console.log('Shutting down');

await shutdown();






//Player 2 policies which can be changed by another user
function P2_init_policy(size) {
  const P2x = Math.floor(Math.random() * size);
  const P2y = Math.floor(Math.random() * size);
  return [P2x, P2y];
}
function P2_move_policy(P2x, P2y, step) {
  let P2direction = Math.floor(Math.random() * 4 + 1);
  return P2direction;
}
function P2_action_policy(P2x, P2y, step) {
  const attack_x = Math.floor(Math.random() * size);
  const attack_y = Math.floor(Math.random() * size);
  return [Math.round(Math.random()), attack_x, attack_y];
}

