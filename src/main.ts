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
  UInt32,
  fetchAccount,
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

function comb_to_indiv(comb: Field, index: number) {
  const combInt = UInt32.from(comb);
  const modnum = UInt32.from(65536);
  const divmod = combInt.divMod(modnum);

  if (index == 0) {
    return divmod.quotient.toFields()[0];
  } else {
    return divmod.rest.toFields()[0];
  }
}

function indiv_to_comb(first: Field, second: Field) {
  const two16 = Field(65536);
  return first.mul(two16).add(second);
}
// ----------------------------------------------------

// create a destination we will deploy the smart contract to
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();

const zkAppInstance = new CapSonar(zkAppAddress); //confused why there is one address but no args in constructor
const deployTxn = await Mina.transaction(deployerAccount, () => {
  AccountUpdate.fundNewAccount(deployerAccount);
  zkAppInstance.deploy();
});
await deployTxn.prove();
await deployTxn.sign([deployerKey, zkAppPrivateKey]).send();

const txn0a = await Mina.transaction(senderAccount, () => {
  zkAppInstance.init_board(Field(100));
});
await txn0a.prove();
await txn0a.sign([senderKey]).send();

const txn0b = await Mina.transaction(senderAccount, () => {
  zkAppInstance.p1_init_position(salt, Field(0), Field(0));
});
await txn0b.prove();
await txn0b.sign([senderKey]).send();

const txn0c = await Mina.transaction(senderAccount, () => {
  zkAppInstance.p2_init_position(salt, Field(0), Field(0));
});
await txn0c.prove();
await txn0c.sign([senderKey]).send();

const txn0d = await Mina.transaction(senderAccount, () => {
  zkAppInstance.init_health(Field(10));
});
await txn0d.prove();
await txn0d.sign([senderKey]).send();

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
const num0 = zkAppInstance.P1_pos.get();
console.log('(x, y) after init:', num0.toString());

const numt0 = indiv_to_comb(Field(0), Field(0));
Poseidon.hash([salt, numt0]).assertEquals(num0);

// ----------------------------------------------------

const txn1 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update_p1_pos(Field(1), Field(0), Field(0), salt);
});

await txn1.prove();
await txn1.sign([senderKey]).send();

const num1 = zkAppInstance.P1_pos.get();
console.log('(x, y) after init:', num1.toString());

const numt1 = indiv_to_comb(Field(0), Field(1));
Poseidon.hash([salt, numt1]).assertEquals(num1);

// ----------------------------------------------------

const txn2 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update_p1_pos(Field(2), Field(0), Field(1), salt);
});

await txn2.prove();
await txn2.sign([senderKey]).send();

const num2 = zkAppInstance.P1_pos.get();
console.log('(x, y) after init:', num2.toString());

const numt2 = indiv_to_comb(Field(1), Field(1));
Poseidon.hash([salt, numt2]).assertEquals(num2);

// ----------------------------------------------------

const txn3 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update_p1_pos(Field(3), Field(1), Field(1), salt);
});

await txn3.prove();
await txn3.sign([senderKey]).send();

const num3 = zkAppInstance.P1_pos.get();
console.log('(x, y) after init:', num3.toString());

const numt3 = indiv_to_comb(Field(1), Field(0));
Poseidon.hash([salt, numt3]).assertEquals(num3);

// ----------------------------------------------------

const txn4 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update_p1_pos(Field(4), Field(1), Field(0), salt);
});

await txn4.prove();
await txn4.sign([senderKey]).send();

const num4 = zkAppInstance.P1_pos.get();
console.log('(x, y) after init:', num4.toString());

const numt4 = indiv_to_comb(Field(0), Field(0));
Poseidon.hash([salt, numt4]).assertEquals(num4);
// ----------------------------------------------------

const txn5 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.check_valid_pos(Field(0), Field(0));
});

await txn5.prove();
await txn5.sign([senderKey]).send();

// ----------------------------------------------------

const txn6 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.p1_attack_p2(Field(0), Field(0));
});

await txn6.prove();
await txn6.sign([senderKey]).send();

const step_size_1 = zkAppInstance.step_size.get();
console.log('step size: ', step_size_1.toString());

const numt6 = indiv_to_comb(Field(0), Field(100));
numt6.assertEquals(step_size_1);

const atk1a = zkAppInstance.P2attackedatXY.get();
const atk1b = zkAppInstance.P1P2attacked.get();

const numt6b = indiv_to_comb(Field(0), Field(0));
numt6b.assertEquals(atk1a);
Field(1).assertEquals(atk1b);

console.log('P2 attacked at: %d, P2 is attacked? %d', atk1a, atk1b);

// ----------------------------------------------------

const p1health_before = zkAppInstance.P1P2health.get();

const txn7 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.p2_check_if_attacked(Field(0), Field(0), salt);
});

await txn7.prove();
await txn7.sign([senderKey]).send();

const p1health_after = zkAppInstance.P1P2health.get();
Field(2).assertEquals(p1health_before.sub(p1health_after));

console.log(zkAppInstance.P1P2attacked.get().toString());
console.log(zkAppInstance.P1P2attacked.get().div(2).mul(2).toString());
const atk2b = zkAppInstance.P1P2attacked.get();
Field(0).assertEquals(atk2b);

// ----------------------------------------------------

const txn8 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.p1_attack_p2(Field(1), Field(0));
});

await txn8.prove();
await txn8.sign([senderKey]).send();

const step_size_2 = zkAppInstance.step_size.get();
console.log('step size: ', step_size_2.toString());

const numt8 = indiv_to_comb(Field(0), Field(100));
numt8.assertEquals(step_size_2);

const atk3a = zkAppInstance.P2attackedatXY.get();
const atk3b = zkAppInstance.P1P2attacked.get();

const numt8b = indiv_to_comb(Field(1), Field(0));
numt8b.assertEquals(atk3a);
Field(1).assertEquals(atk3b);
Field(1).assertEquals(comb_to_indiv(atk3b, 1));

console.log('P2 attacked at: %d, P2 is attacked? %d', atk3a, atk3b);

// ----------------------------------------------------

console.log('Shutting down');

await shutdown();
