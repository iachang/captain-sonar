import {
  Field,
  SmartContract,
  state,
  State,
  method,
  Poseidon,
  Character,
} from 'snarkyjs';

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

  init() {
    super.init();
  }

  @method init_position(salt: Field, player: Field, x: Field, y: Field) {
    if (player.equals(Field(1))) {
      this.P1x.set(Poseidon.hash([salt, x]));
      this.P1y.set(Poseidon.hash([salt, y]));
    } else {
      this.P2x.set(Poseidon.hash([salt, x]));
      this.P2y.set(Poseidon.hash([salt, y]));
    }
  }

  @method update_pos(direction: Character, salt: Field, player: Field) {
    let dx = 0;
    let dy = 0;
    if (direction.equals(Character.fromString('N'))) {
      dy = 1;
    } else if (direction.equals(Character.fromString('S'))) {
      dy = -1;
    } else if (direction.equals(Character.fromString('E'))) {
      dx = 1;
    } else if (direction.equals(Character.fromString('W'))) {
      dx = -1;
    } else {
      // throw error
    }

    if (player.equals(Field(1))) {
      const curr_P1x = this.P1x.get();
      const curr_P1y = this.P1y.get();
      this.P1x.assertEquals(curr_P1x);
      this.P1y.assertEquals(curr_P1y);
      const new_P1x = curr_P1x.add(Field(dx));
      const new_P1y = curr_P1y.add(Field(dy));
      this.P1x.set(new_P1x);
      this.P1y.set(new_P1y);
    } else {
      const curr_P2x = this.P2x.get();
      const curr_P2y = this.P2y.get();
      this.P2x.assertEquals(curr_P2x);
      this.P2y.assertEquals(curr_P2y);
      const new_P2x = curr_P2x.add(Field(dx));
      const new_P2y = curr_P2y.add(Field(dy));
      this.P2x.set(new_P2x);
      this.P2y.set(new_P2y);
    }
  }

  @method get_pos(player: Field) {
    if (player.equals(Field(1))) {
      return [this.P1x.get(), this.P1y.get()];
    } else {
      return [this.P2x.get(), this.P2y.get()];
    }
  }
}
