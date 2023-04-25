import {
  Field,
  SmartContract,
  state,
  State,
  method,
  Poseidon,
  Character,
} from 'snarkyjs';

export class CapSonar extends SmartContract {
  @state(Field) P1x = State<Field>(); // Hidden
  @state(Field) P1y = State<Field>(); // Hidden
  @state(Field) P2x = State<Field>(); // Hidden
  @state(Field) P2y = State<Field>(); // Hidden
  @state(Field) P1health = State<Field>(); // Not Hidden
  @state(Field) P2health = State<Field>(); // Not Hidden
  @state(Field) P1_submerge_step = State<Field>(); // Not Hidden
  @state(Field) P2_submerge_step = State<Field>(); // Not Hidden
  @state(Field) step = State<Field>(); // Not Hidden
  @state(Field) size = State<Field>(); // Not Hidden

  init() {
    super.init();
  }

  @method init_health(salt: Field, player:Field, health: Field) {
    if (player.equals(Field(1))) {
      this.P1health.set(Poseidon.hash([salt, health]));
    } else {
      this.P2health.set(Poseidon.hash([salt, health]));
    }
  }

  @method init_position(salt:Field, player:Field, x: Field, y: Field) {
    if (player.equals(Field(1))) {
      this.P1x.set(Poseidon.hash([ salt, x ]));
      this.P1y.set(Poseidon.hash([ salt, y ]));
    } else {
      this.P2x.set(Poseidon.hash([salt, x]));
      this.P2y.set(Poseidon.hash([salt, y]));
    }
  }

  @method init_board(size: Field) {
    this.step.set(Field(0));
    this.P1_submerge_step.set(Field(0));
    this.P2_submerge_step.set(Field(0));
    this.size.set(size);
  }

  /**
   * Update position of the player with a direction
   * @param direction Direction of the move
   * @param curr_x Current x position of the player
   * @param curr_y Current y position of the player
   * @param salt Salt used to hash the position
   * @param player Current players
   */

  @method update_pos(direction: Character, curr_x:Field, curr_y:Field, salt: Field, player: Field) {
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
    } else {direction
      throw new Error('Invalid direction');
    }
    if (player.equals(Field(1))) {
      const curr_P1x = this.P1x.get();
      this.P1x.assertEquals(curr_P1x);
      Poseidon.hash([ salt, curr_x ]).assertEquals(curr_P1x);
      this.P1x.set(Poseidon.hash([ salt, curr_P1x.add(Field(dx)) ]));
      const curr_P1y = this.P1y.get();
      this.P1y.assertEquals(curr_P1y);
      Poseidon.hash([ salt, curr_y ]).assertEquals(curr_P1y);
      this.P1y.set(Poseidon.hash([ salt, curr_P1y.add(Field(dy)) ]));
    } else {
      const curr_P2x = this.P2x.get();
      this.P2x.assertEquals(curr_P2x);
      Poseidon.hash([ salt, curr_x ]).assertEquals(curr_P2x);
      this.P2x.set(Poseidon.hash([ salt, curr_P2x.add(Field(dx)) ]));
      const curr_P2y = this.P2y.get();
      this.P2y.assertEquals(curr_P2y);
      Poseidon.hash([ salt, curr_y ]).assertEquals(curr_P2y);
      this.P2y.set(Poseidon.hash([ salt, curr_P2y.add(Field(dy)) ]));
    }
  }
  @method get_health(player: Field) {
      if (player.equals(Field(1))) {
          return this.P1health.get();
      } else {
          return this.P2health.get();
      }
  }

  /**
   * The player attacks the other player at position x and y.
   * Decrement health by 2 if the player is attacked at the exact position and 1 if the player is attacked at a position within 1 manhattan distance
   * @param x The x position of the attack
   * @param y The y position of the attack
   * @param player The player that is attacking
   * @returns  2 if the player is attacked at the exact position x and y and 1 if the player is attacked at a position within 1 manhattan distance of x and y
   */
  @method attack_player(x: Field, y: Field, player: Field) {
    if (player.equals(Field(1))) {
      const curr_P2health = this.P2health.get();
      this.P2health.assertEquals(curr_P2health);
      if (this.P2x.get().equals(x) && this.P2y.get().equals(y)) {
        this.P2health.set(curr_P2health.sub(2));
        return 2;
      } else if ((this.P2x.get().equals(x.add(1)) && this.P2y.get().equals(y)) || 
        (this.P2x.get().equals(x.sub(1)) && this.P2y.get().equals(y)) || 
        (this.P2x.get().equals(x) && this.P2y.get().equals(y.add(1))) || 
        (this.P2x.get().equals(x) && this.P2y.get().equals(y.sub(1)))) {
        this.P2health.set(curr_P2health.sub(1));
        return 1;
      }
    } else {
      const curr_P1health = this.P1health.get();
      this.P1health.assertEquals(curr_P1health);
      if (this.P1x.get().equals(x) && this.P1y.get().equals(y)) {
        this.P1health.set(curr_P1health.sub(2));
        return 2;
      } else if ((this.P1x.get().equals(x.add(1)) && this.P1y.get().equals(y)) || 
        (this.P1x.get().equals(x.sub(1)) && this.P1y.get().equals(y)) || 
        (this.P1x.get().equals(x) && this.P1y.get().equals(y.add(1))) || 
        (this.P1x.get().equals(x) && this.P1y.get().equals(y.sub(1)))) {
        this.P1health.set(curr_P1health.sub(1));
        return 1;
      }
    }
  }

  /**
   * The player submerges into the water and can move 2 steps in the next turn
   * This special power is activated after 15 turns
   */
  @method sp_submerge(curr_x: Field, curr_y: Field, step1:Character, step2:Character, salt: Field, player: Field) {
    let dx = 0;
    let dy = 0;
    // if (direction.equals(Character.fromString('N'))) {
    //   dy = 1;
    // } else if (direction.equals(Character.fromString('S'))) {
    //   dy = -1;
    // } else if (direction.equals(Character.fromString('E'))) {
    //   dx = 1;
    // } else if (direction.equals(Character.fromString('W'))) {
    //   dx = -1;
    // } else {
    //   throw new Error('Invalid direction');
    // }
    if (player.equals(Field(1))) {
      const curr_P1x = this.P1x.get();
      this.P1x.assertEquals(curr_P1x);
      Poseidon.hash([ salt, curr_x ]).assertEquals(curr_P1x);
      this.P1x.set(Poseidon.hash([ salt, curr_P1x.add(Field(dx)) ]));
      const curr_P1y = this.P1y.get();
      this.P1y.assertEquals(curr_P1y);
      Poseidon.hash([ salt, curr_y ]).assertEquals(curr_P1y);
      this.P1y.set(Poseidon.hash([ salt, curr_P1y.add(Field(dy)) ]));
    } else {
      const curr_P2x = this.P2x.get();
      this.P2x.assertEquals(curr_P2x);
      Poseidon.hash([ salt, curr_x ]).assertEquals(curr_P2x);
      this.P2x.set(Poseidon.hash([ salt, curr_P2x.add(Field(dx)) ]));
      const curr_P2y = this.P2y.get();
      this.P2y.assertEquals(curr_P2y);
      Poseidon.hash([ salt, curr_y ]).assertEquals(curr_P2y);
      this.P2y.set(Poseidon.hash([ salt, curr_P2y.add(Field(dy)) ]));
    }
  











  }
}
