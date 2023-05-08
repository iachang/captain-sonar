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

import promptSync from 'prompt-sync';
const prompt = promptSync({sigint: true});

// Random number from 1 - 10
const numberToGuess = Math.floor(Math.random() * 10) + 1;
// This variable is used to determine if the app should continue prompting the user for input
let foundCorrectNumber = false;

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

let P2x = Field.random(); //restrict to size of the board
let P2y = Field.random();

let P1health = health;
let P2health = health;

while (P1health > 0 && P2health > 0) {
  // Get user input
  let guess = prompt('Guess a number from 1 to 10: ');
  // Convert the string input to a number
  

  // Compare the guess to the secret answer and let the user know.
  if (guess === numberToGuess) {
    console.log('Congrats, you got it!');
    foundCorrectNumber = true;
  } else {
    console.log('Sorry, guess again!');
  }
}