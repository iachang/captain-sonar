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

let salt_p1 = Field.random();
let salt_p2 = Field.random();
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
// const two16 = Field(2**16);

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
  zkAppInstance.p1_init_position(salt_p1, Field(0), Field(0));
});
await txn0b.prove();
await txn0b.sign([senderKey]).send();

const txn0c = await Mina.transaction(senderAccount, () => {
  zkAppInstance.p2_init_position(salt_p2, Field(0), Field(0));
});
await txn0c.prove();
await txn0c.sign([senderKey]).send();

const txn0d = await Mina.transaction(senderAccount, () => {
  zkAppInstance.init_health(Field(10));
});
await txn0d.prove();
await txn0d.sign([senderKey]).send();

// get the initial state of IncrementSecret after deployment
const num0 = zkAppInstance.P1_pos.get();
console.log('(x, y) after init:', num0.toString());

const numt0 = indiv_to_comb(Field(0), Field(0));
Poseidon.hash([salt_p1, numt0]).assertEquals(num0);

// ----------------------------------------------------
let salt1 = Field.random();
const txn1 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update_p1_pos(Field(1), Field(0), Field(0), salt_p1, salt1);
});

await txn1.prove();
await txn1.sign([senderKey]).send();

const num1 = zkAppInstance.P1_pos.get();
console.log('(x, y) after init:', num1.toString());

const numt1 = indiv_to_comb(Field(0), Field(1));
Poseidon.hash([salt1, numt1]).assertEquals(num1);

// ----------------------------------------------------
let salt2 = Field.random();
const txn2 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update_p1_pos(Field(2), Field(0), Field(1), salt1, salt2);
});

await txn2.prove();
await txn2.sign([senderKey]).send();

const num2 = zkAppInstance.P1_pos.get();
console.log('(x, y) after init:', num2.toString());

const numt2 = indiv_to_comb(Field(1), Field(1));
Poseidon.hash([salt2, numt2]).assertEquals(num2);

// ----------------------------------------------------
let salt3 = Field.random();
const txn3 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update_p1_pos(Field(3), Field(1), Field(1), salt2, salt3);
});

await txn3.prove();
await txn3.sign([senderKey]).send();

const num3 = zkAppInstance.P1_pos.get();
console.log('(x, y) after init:', num3.toString());

const numt3 = indiv_to_comb(Field(1), Field(0));
Poseidon.hash([salt3, numt3]).assertEquals(num3);

// ----------------------------------------------------
let salt4 = Field.random();
const txn4 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.update_p1_pos(Field(4), Field(1), Field(0), salt3, salt4);
});

await txn4.prove();
await txn4.sign([senderKey]).send();

const num4 = zkAppInstance.P1_pos.get();
console.log('(x, y) after init:', num4.toString());

const numt4 = indiv_to_comb(Field(0), Field(0));
Poseidon.hash([salt4, numt4]).assertEquals(num4);
// ----------------------------------------------------

const txn5 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.check_valid_pos(Field(0), Field(0));
});

await txn5.prove();
await txn5.sign([senderKey]).send();

// // ----------------------------------------------------

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

// // ----------------------------------------------------
const p1health_before = zkAppInstance.P1P2health.get();

const txn7 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.p2_check_if_attacked(Field(0), Field(0), salt_p2);
});

await txn7.prove();
await txn7.sign([senderKey]).send();

const p1health_after = zkAppInstance.P1P2health.get();
Field(2).assertEquals(p1health_before.sub(p1health_after));
indiv_to_comb(Field(10), Field(8)).assertEquals(p1health_after);

const atk2b = zkAppInstance.P1P2attacked.get();
Field(0).assertEquals(atk2b);

// // ----------------------------------------------------

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
Field(0).assertEquals(comb_to_indiv(atk3b, 0));
Field(1).assertEquals(comb_to_indiv(atk3b, 1));

// console.log('P2 attacked at: %d, P2 is attacked? %d', atk3a, atk3b);

// // ----------------------------------------------------

const txn9 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.p2_attack_p1(Field(0), Field(1));
});

await txn9.prove();
await txn9.sign([senderKey]).send();

const atk4a = zkAppInstance.P1attackedatXY.get();
const atk4b = zkAppInstance.P1P2attacked.get();

const numt9a = indiv_to_comb(Field(0), Field(1));
numt9a.assertEquals(atk4a);
Field(1).assertEquals(comb_to_indiv(atk4b, 0));
Field(1).assertEquals(comb_to_indiv(atk4b, 1));

console.log('P2 attacked at: %d, P2 is attacked? %d', atk3a, atk3b);

// ----------------------------------------------------

const p1health_before_2 = zkAppInstance.P1P2health.get();

const txn10 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.p2_check_if_attacked(Field(0), Field(0), salt_p2);
});

await txn10.prove();
await txn10.sign([senderKey]).send();

const p1health_after_2 = zkAppInstance.P1P2health.get();
Field(1).assertEquals(p1health_before_2.sub(p1health_after_2));
indiv_to_comb(Field(10), Field(7)).assertEquals(p1health_after_2);

const atk5a = zkAppInstance.P1P2attacked.get();
Field(1).assertEquals(comb_to_indiv(atk5a, 0));
Field(0).assertEquals(comb_to_indiv(atk5a, 1));

// ----------------------------------------------------

const txn11 = await Mina.transaction(senderAccount, () => {
  zkAppInstance.p1_check_if_attacked(Field(0), Field(0), salt4);
});

await txn11.prove();
await txn11.sign([senderKey]).send();

const p2health_after = zkAppInstance.P1P2health.get();
indiv_to_comb(Field(9), Field(7)).assertEquals(p2health_after);

const atk6a = zkAppInstance.P1P2attacked.get();
Field(0).assertEquals(comb_to_indiv(atk6a, 0));
Field(0).assertEquals(comb_to_indiv(atk6a, 1));

// ----------------------------------------------------

console.log('Shutting down');

await shutdown();
