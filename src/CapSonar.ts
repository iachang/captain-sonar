import { Field, SmartContract, state, State, method, Poseidon, Character } from 'snarkyjs';

/**
 * Basic Example
 * See https://docs.minaprotocol.com/zkapps for more info.
 *
 * The Add contract initializes the state variable 'num' to be a Field(1) value by default when deployed.
 * When the 'update' method is called, the Add contract adds Field(2) to its 'num' contract state.
 *
 * This file is safe to delete and replace with your own contract.
 */
export class CapSonar extends SmartContract {
  @state(Field) P1x = State<Field>();
  @state(Field) P1y = State<Field>();
  @state(Field) P2x = State<Field>();
  @state(Field) P2y = State<Field>();
  @state(Field) P1health = State<Field>();
  @state(Field) P2health = State<Field>();

  init() {
    super.init();
  }

  @method init_health(salt: Field, health: Field) {
    this.P1health.set(Poseidon.hash([salt, health]));
    this.P2health.set(Poseidon.hash([salt, health]));
  }

  @method init_position(salt:Field, player:Field, x: Field, y: Field) {
    if (player.equals(Field.fromNumber(1))) {
      this.P1x.set(Poseidon.hash([ salt, x ]));
      this.P1y.set(Poseidon.hash([ salt, y ]));
    } else {
      this.P2x.set(Poseidon.hash([ salt, x ]));
      this.P2y.set(Poseidon.hash([ salt, y ]));
    }
  }

  @method update_pos(direction: Character, salt: Field, player:Field) {
    var dx = 0;
    var dy = 0;
    if (direction.equals(Character.fromAscii('N'))) {
      dy = 1;
    } else if (direction.equals(Character.fromAscii('S'))) {
      dy = -1;
    } else if (direction.equals(Character.fromAscii('E'))) {
      dx = 1;
    } else if (direction.equals(Character.fromAscii('W'))) {
      dx = -1;
    } else {
      // throw error
    }

    if (player.equals(Field.fromNumber(1))) {
      const curr_P1x = this.P1x.get();
      const curr_P1y = this.P1y.get();
      this.P1x.assertEquals(curr_P1x);
      this.P1y.assertEquals(curr_P1y);
      const new_P1x = curr_P1x.add(Field.fromNumber(dx));
      const new_P1y = curr_P1y.add(Field.fromNumber(dy));
      this.P1x.set(new_P1x);
      this.P1y.set(new_P1y);
    } else {
      const curr_P2x = this.P2x.get();
      const curr_P2y = this.P2y.get();
      this.P2x.assertEquals(curr_P2x);
      this.P2y.assertEquals(curr_P2y);
      const new_P2x = curr_P2x.add(Field.fromNumber(dx));
      const new_P2y = curr_P2y.add(Field.fromNumber(dy));
      this.P2x.set(new_P2x);
      this.P2y.set(new_P2y);
    }
  }

  @method get_pos(player: Field) {
      if (player.equals(Field.fromNumber(1))) {
          return [this.P1x.get(), this.P1y.get()];
      } else {
          return [this.P2x.get(), this.P2y.get()];
      }
  }

  @method get_health(player: Field) {
      if (player.equals(Field.fromNumber(1))) {
          return this.P1health.get();
      } else {
          return this.P2health.get();
      }
  }

  /**
   * decrement health of player by 2 if that players position is equal to the other players position is x and y
   * decrement health of player by 1 if that players position is within 1 manhattan of the other players position is x and y
  **/
  @method attack_player(salt: Field, player: Field, x: Field, y: Field) {
    if (player.equals(Field.fromNumber(1))) {
      const curr_P2health = this.P2health.get();
      this.P2health.assertEquals(curr_P2health);
      if (this.P2x.get().equals(x) && this.P2y.get().equals(y)) {
        const new_P2health = curr_P2health.sub(2);
        this.P2health.set(new_P2health);
        return 2;
      } else if ((this.P2x.get().equals(x.add(1)) && this.P2y.get().equals(y)) || 
        (this.P2x.get().equals(x.sub(1)) && this.P2y.get().equals(y)) || 
        (this.P2x.get().equals(x) && this.P2y.get().equals(y.add(1))) || 
        (this.P2x.get().equals(x) && this.P2y.get().equals(y.sub(1)))) {
        const new_P2health = curr_P2health.sub(1);
        this.P2health.set(new_P2health);
        return 1;
      }
    } else {
      const curr_P1health = this.P1health.get();
      this.P1health.assertEquals(curr_P1health);
      if (this.P1x.get().equals(x) && this.P1y.get().equals(y)) {
        const new_P1health = curr_P1health.sub(2);
        this.P1health.set(new_P1health);
        return 2;
      } else if ((this.P1x.get().equals(x.add(1)) && this.P1y.get().equals(y)) || 
        (this.P1x.get().equals(x.sub(1)) && this.P1y.get().equals(y)) || 
        (this.P1x.get().equals(x) && this.P1y.get().equals(y.add(1))) || 
        (this.P1x.get().equals(x) && this.P1y.get().equals(y.sub(1)))) {
        const new_P1health = curr_P1health.sub(1);
        this.P1health.set(new_P1health);
        return 1;
      }
    }
  }

  //check if get_pos and get_health are working, through the salt
}
