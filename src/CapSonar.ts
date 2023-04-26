import {
  Field,
  SmartContract,
  state,
  State,
  method,
  Poseidon,
  Character,
  Bool,
  Circuit,
  Int64,
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
  @state(Field) P1attackedatX = State<Field>(); // Not Hidden
  @state(Field) P1attackedatY = State<Field>(); // Not Hidden
  @state(Field) P2attackedatX = State<Field>(); // Not Hidden
  @state(Field) P2attackedatY = State<Field>(); // Not Hidden
  @state(Field) P1attacked = State<Field>(); // Not Hidden
  @state(Field) P2attacked = State<Field>(); // Not Hidden
  @state(Field) P1_last_attack = State<Field>(); // Not Hidden
  @state(Field) P2_last_attack = State<Field>(); // Not Hidden

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

  @method update_p1_pos(direction: Field, xc :Field, yc:Field, salt: Field) {
    // N, E, S, W

    const d1 = direction.sub(Field(1));
    const d2 = direction.sub(Field(2));
    const d3 = direction.sub(Field(3));
    const d4 = direction.sub(Field(4));

    const xmove = Circuit.switch(
      [d1.isZero(), d2.isZero(), d3.isZero(), d4.isZero()],
      Field,
      [Field(0), Field(1), Field(0), Field(-1)]
    );

    const ymove = Circuit.switch(
      [d1.isZero(), d2.isZero(), d3.isZero(), d4.isZero()],
      Field,
      [Field(1), Field(0), Field(-1), Field(0)]
    );

    const curr_P1x = this.P1x.get();
    const curr_P1y = this.P1y.get();
    this.P1x.assertEquals(curr_P1x);
    this.P1y.assertEquals(curr_P1y);
    Poseidon.hash([salt, xc]).assertEquals(curr_P1x);
    Poseidon.hash([salt, yc]).assertEquals(curr_P1y);
    this.P1x.set(Poseidon.hash([salt, xc.add(xmove)]));
    this.P1y.set(Poseidon.hash([salt, yc.add(ymove)]));
  }

  @method update_p2_pos(direction: Field, xc :Field, yc:Field, salt: Field) {
    // N, E, S, W
    // have to make sure we don't leave the board with size

    const d1 = direction.sub(Field(1));
    const d2 = direction.sub(Field(2));
    const d3 = direction.sub(Field(3));
    const d4 = direction.sub(Field(4));

    const xmove = Circuit.switch(
      [d1.isZero(), d2.isZero(), d3.isZero(), d4.isZero()],
      Field,
      [Field(0), Field(1), Field(0), Field(-1)]
    );

    const ymove = Circuit.switch(
      [d1.isZero(), d2.isZero(), d3.isZero(), d4.isZero()],
      Field,
      [Field(1), Field(0), Field(-1), Field(0)]
    );

    const curr_P2x = this.P2x.get();
    const curr_P2y = this.P2y.get();
    this.P2x.assertEquals(curr_P2x);
    this.P2y.assertEquals(curr_P2y);
    Poseidon.hash([salt, xc]).assertEquals(curr_P2x);
    Poseidon.hash([salt, yc]).assertEquals(curr_P2y);
    this.P2x.set(Poseidon.hash([salt, xc.add(xmove)]));
    this.P2y.set(Poseidon.hash([salt, yc.add(ymove)]));
  }

  @method get_health(player: Field) {
      if (player.equals(Field(1))) {
          return this.P1health.get();
      } else {
          return this.P2health.get();
      }
  }

  //check the x and y is within the board size
  @method check_valid_pos(x: Field, y:Field) {
    const size = this.size.get();
    const valid = x.lessThan(size).and(y.lessThan(size)).and(x.greaterThanOrEqual(Field(0))).and(y.greaterThanOrEqual(Field(0)));
    return valid;
  }

  //wait 5 steps to attack again
  @method p1_attack_p2(x: Field, y: Field) {
    const attack = Circuit.if(this.step.get().sub(this.P1_last_attack.get()).greaterThanOrEqual(5), Field(1), Field(0));
    this.P1_last_attack.set(Circuit.if(attack.equals(Field(1)), this.step.get(), this.P1_last_attack.get()));
    this.P2attackedatX.set(Circuit.if(attack.equals(Field(1)), x, this.P2attackedatX.get()));
    this.P2attackedatY.set(Circuit.if(attack.equals(Field(1)), y, this.P2attackedatY.get()));
    this.P2attacked.set(Circuit.if(attack.equals(Field(1)), Field(1), this.P2attacked.get()));
  }

  @method p2_attack_p1(x: Field, y: Field) {
    const attack = Circuit.if(this.step.get().sub(this.P2_last_attack.get()).greaterThanOrEqual(5), Field(1), Field(0));
    this.P2_last_attack.set(Circuit.if(attack.equals(Field(1)), this.step.get(), this.P2_last_attack.get()));
    this.P1attackedatX.set(Circuit.if(attack.equals(Field(1)), x, this.P1attackedatX.get()));
    this.P1attackedatY.set(Circuit.if(attack.equals(Field(1)), y, this.P1attackedatY.get()));
    this.P1attacked.set(Circuit.if(attack.equals(Field(1)), Field(1), this.P1attacked.get()));
  }

  /**
   * Check if P1 has been attacked.
   * Decrement health by 2 if the player is attacked at the exact position and 1 if the player is attacked at a position within 1 manhattan distance
   * @param x The x position of the p1
   * @param y The y position of the p1
   * @returns  2 if the player is attacked at the exact position x and y and 1 if the player is attacked at a position within 1 manhattan distance of x and y
   */
  @method p1_check_if_attacked(x: Field, y: Field, salt:Field) {
    const curr_P1health = this.P1health.get();
    this.P1health.assertEquals(curr_P1health);

    const curr_P1x = this.P1x.get();
    const curr_P1y = this.P1y.get();
    this.P1x.assertEquals(curr_P1x);
    this.P1y.assertEquals(curr_P1y);
    Poseidon.hash([salt, x]).assertEquals(curr_P1x);
    Poseidon.hash([salt, y]).assertEquals(curr_P1y);

    const xsub1 = this.P1attackedatX.get().sub(1);
    const ysub1 = this.P1attackedatY.get().sub(1);
    const xadd1 = this.P1attackedatX.get().add(1);
    const yadd1 = this.P1attackedatY.get().add(1);

    const cond1 = x.equals(this.P1attackedatX.get()).and(y.equals(this.P1attackedatY.get()))
    const cond2 = x.equals(xsub1).and(y.equals(this.P1attackedatY.get()))
    const cond3 = x.equals(xadd1).and(y.equals(this.P1attackedatY.get()))
    const cond4 = x.equals(this.P1attackedatX.get()).and(y.equals(ysub1))
    const cond5 = x.equals(this.P1attackedatX.get()).and(y.equals(yadd1))
    const damage = Circuit.switch(
      [cond1, cond2, cond3, cond4, cond5, (cond1.or(cond2).or(cond3).or(cond4).or(cond5)).not()],
      Field,
      [Field(2), Field(1), Field(1), Field(1), Field(1), Field(0)]
    );
    this.P1health.set(curr_P1health.sub(damage.mul(this.P1attacked.get())))
    this.P1attacked.set(Field(0));
  }

  @method p2_check_if_attacked(x: Field, y: Field, salt:Field) {
    const curr_P2health = this.P2health.get();
    this.P2health.assertEquals(curr_P2health);

    const curr_P2x = this.P2x.get();
    const curr_P2y = this.P2y.get();
    this.P2x.assertEquals(curr_P2x);
    this.P2y.assertEquals(curr_P2y);
    Poseidon.hash([salt, x]).assertEquals(curr_P2x);
    Poseidon.hash([salt, y]).assertEquals(curr_P2y);

    const xsub1 = this.P2attackedatX.get().sub(1);
    const ysub1 = this.P2attackedatY.get().sub(1);
    const xadd1 = this.P2attackedatX.get().add(1);
    const yadd1 = this.P2attackedatY.get().add(1);

    const cond1 = x.equals(this.P2attackedatX.get()).and(y.equals(this.P2attackedatY.get()))
    const cond2 = x.equals(xsub1).and(y.equals(this.P2attackedatY.get()))
    const cond3 = x.equals(xadd1).and(y.equals(this.P2attackedatY.get()))
    const cond4 = x.equals(this.P2attackedatX.get()).and(y.equals(ysub1))
    const cond5 = x.equals(this.P2attackedatX.get()).and(y.equals(yadd1))
    const damage = Circuit.switch(
      [cond1, cond2, cond3, cond4, cond5, (cond1.or(cond2).or(cond3).or(cond4).or(cond5)).not()],
      Field,
      [Field(2), Field(1), Field(1), Field(1), Field(1), Field(0)]
    );
    this.P2health.set(curr_P2health.sub(damage.mul(this.P2attacked.get())))
    this.P2attacked.set(Field(0));
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
