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

let salt = Field.random();

// ----------------------------------------------------

// create a destination we will deploy the smart contract to
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
const two16 = Field(2**16);

const zkAppInstance = new CapSonar(zkAppAddress); //confused why there is one address but no args in constructor
const deployTxn = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkAppInstance.deploy();
  zkAppInstance.p1_init_position(salt, Field(0), Field(0), two16);
  zkAppInstance.p2_init_position(salt, Field(0), Field(0), two16);
  zkAppInstance.init_board(Field(100), two16);
});
await deployTxn.prove();
await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();

// in the while loop, we want P2 random policy
/*
while (true) {
  // get input from user terminal
  const input = prompt('Enter a direction (N, S, E, W): ');
  if (input === null) {
    break;
  } else if (input.length !== 1) {
    console.log('Invalid input');
    continue;
  } else if (!['N', 'S', 'E', 'W'].includes(input)) {
    console.log('Invalid input');
    continue;
  }

  // query policy

  // change the update of the game using queryPosition
  
  // move

  // make a fake policy for player 2 in index.ts

}*/

// get the initial state of IncrementSecret after deployment
// const numx0 = zkAppInstance.P1x.get();
// const numy0 = zkAppInstance.P1y.get();
// console.log('(x, y) after init:', numx0.toString(), numy0.toString());

// Poseidon.hash([salt, Field(0)]).assertEquals(numx0);
// Poseidon.hash([salt, Field(0)]).assertEquals(numy0);

// ----------------------------------------------------
const txn1 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update_p1_pos(Field(1), Field(0), Field(0), salt, two16);
});

await txn1.prove();
await txn1.sign([senderKey]).send();

// const numx1 = zkAppInstance.P1x.get();
// const numy1 = zkAppInstance.P1y.get();
// console.log('(x, y) after txn1:', numx1.toString(), numy1.toString());

// Poseidon.hash([salt, Field(0)]).assertEquals(numx1);
// Poseidon.hash([salt, Field(1)]).assertEquals(numy1);

// ----------------------------------------------------

const txn2 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update_p1_pos(Field(2), Field(0), Field(1), salt, two16);
});

await txn2.prove();
await txn2.sign([senderKey]).send();

// const numx2 = zkAppInstance.P1x.get();
// const numy2 = zkAppInstance.P1y.get();
// console.log('(x, y) after txn2:', numx2.toString(), numy2.toString());

// Poseidon.hash([salt, Field(1)]).assertEquals(numx2);
// Poseidon.hash([salt, Field(1)]).assertEquals(numy2);

// ----------------------------------------------------

const txn3 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update_p1_pos(Field(3), Field(1), Field(1), salt, two16);
});

await txn3.prove();
await txn3.sign([senderKey]).send();

// const numx3 = zkAppInstance.P1x.get();
// const numy3 = zkAppInstance.P1y.get();
// console.log('(x, y) after txn3:', numx3.toString(), numy3.toString());

// Poseidon.hash([salt, Field(1)]).assertEquals(numx3);
// Poseidon.hash([salt, Field(0)]).assertEquals(numy3);

// ----------------------------------------------------

const txn4 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update_p1_pos(Field(4), Field(1), Field(0), salt, two16);
});

await txn4.prove();
await txn4.sign([senderKey]).send();

// const numx4 = zkAppInstance.P1x.get();
// const numy4 = zkAppInstance.P1y.get();
// console.log('(x, y) after txn4', numx4.toString(), numy4.toString());

// Poseidon.hash([salt, Field(0)]).assertEquals(numx4);
// Poseidon.hash([salt, Field(0)]).assertEquals(numy4);

// ----------------------------------------------------

const txn5 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.check_valid_pos(Field(0), Field(0), two16);
});

await txn5.prove();
await txn5.sign([senderKey]).send();

// ----------------------------------------------------

const txn6 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update_p1_pos(Field(3), Field(0), Field(0), salt, two16);
});

await txn6.prove();
await txn6.sign([senderKey]).send();

// const numx5 = zkAppInstance.P1x.get();
// const numy5 = zkAppInstance.P1y.get();
// console.log('(x, y) after txn6', numx5.toString(), numy5.toString());

// Poseidon.hash([salt, Field(0)]).assertEquals(numx5);
// Poseidon.hash([salt, Field(-1)]).assertEquals(numy5);

// ----------------------------------------------------

// ----------------------------------------------------

console.log('Shutting down');

await shutdown();
