import { CapSonar } from './CapSonar.js';
import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
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

const salt = Field.random();

// ----------------------------------------------------

// create a destination we will deploy the smart contract to
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();

const zkAppInstance = new CapSonar(zkAppAddress); //confused why there is one address but no args in constructor
const deployTxn = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkAppInstance.deploy();
  zkAppInstance.init_position(salt, Field(750), Field(0), Field(0));
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
const num0 = zkAppInstance.P1x.get();
console.log('state after init:', num0.toString());

// ----------------------------------------------------

const txn1 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update_pos(Character.fromString('E'), salt, Field(1));
});
await txn1.prove();
await txn1.sign([senderKey]).send();

const num1 = zkAppInstance.P1x.get();
console.log('state after txn1:', num1.toString());

// ----------------------------------------------------

console.log('Shutting down');

await shutdown();
