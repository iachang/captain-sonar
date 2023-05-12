import {
  Field,
  SmartContract,
  state,
  State,
  method,
  Poseidon,
  Circuit,
  UInt32,
} from 'snarkyjs';

export class CapSonar extends SmartContract {
  @state(Field) P1_pos = State<Field>(); // Hidden
  @state(Field) P2_pos = State<Field>(); // Hidden
  @state(Field) step_size = State<Field>(); // Not Hidden
  @state(Field) P1P2health = State<Field>(); // Not Hidden
  @state(Field) P1attackedatXY = State<Field>(); // Not Hidden
  @state(Field) P2attackedatXY = State<Field>(); // Not Hidden
  @state(Field) P1P2attacked = State<Field>(); // Not Hidden
  @state(Field) P1P2_submerge_step = State<Field>(); // Not Hidden

  init() {
    super.init();
  }

  @method init_health(health: Field) {
    this.P1P2health.set(this.indiv_to_comb(health, health));
  }

  @method p2_init_position(salt: Field, x: Field, y: Field) {
    const combined_input = this.indiv_to_comb(x, y);
    this.P2_pos.set(Poseidon.hash([salt, combined_input]));
  }

  @method p1_init_position(salt: Field, x: Field, y: Field) {
    const combined_input = this.indiv_to_comb(x, y);
    this.P1_pos.set(Poseidon.hash([salt, combined_input]));
  }

  @method init_board(size: Field) {
    this.step_size.set(size);
    this.P1P2_submerge_step.set(Field(0));
    this.P1P2attacked.set(Field(0));
    this.P1attackedatXY.set(Field(0));
    this.P2attackedatXY.set(Field(0));
  }

  /**
   * @param first number to store in first 16 bytes
   * @param second number to store in second 16 bytes
   * @returns first * 2^16 + y
   */
  @method indiv_to_comb(first: Field, second:Field): Field {
    const two16 = Field(65536);
    return first.mul(two16).add(second);
  }
  /**
   * @param comb number to split into two 16 byte numbers
   * @returns [first, second] where first is the first 16 bytes of comb and second is the second 16 bytes of comb
   */
   @method comb_to_indiv(comb:Field, index: Field): Field {
    const combInt = UInt32.from(comb)
    const modnum = UInt32.from(Field(65536))
    const divmod = combInt.divMod(modnum);
    return Circuit.if(index.isZero(), divmod.quotient.toFields()[0], divmod.rest.toFields()[0]);
   }

  @method update_p1_pos(direction: Field, xc: Field, yc: Field, salt: Field, new_salt: Field) {
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

    this.check_valid_pos(xc.add(xmove), yc.add(ymove));
    const combined_input = this.indiv_to_comb(xc, yc);
    const curr_P1 = this.P1_pos.get();
    this.P1_pos.assertEquals(curr_P1);
    Poseidon.hash([salt, combined_input]).assertEquals(curr_P1);
    const combined_mod = this.indiv_to_comb(xc.add(xmove), yc.add(ymove));
    this.P1_pos.set(Poseidon.hash([new_salt, combined_mod]));
  }

  @method update_p2_pos(direction: Field, xc: Field, yc: Field, salt: Field, new_salt: Field) {
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

    this.check_valid_pos(xc.add(xmove), yc.add(ymove));
    const combined_input = this.indiv_to_comb(xc, yc);
    // console.log("cur_pos_check", xc, yc, combined_input);
    const curr_P2 = this.P2_pos.get();
    this.P2_pos.assertEquals(curr_P2);
    // console.log("Poseidon.hash([salt, combined_input]).assertEquals(curr_P1)", Poseidon.hash([salt, combined_input]), this.P2_pos.get());
    Poseidon.hash([salt, combined_input]).assertEquals(curr_P2);
    const combined_mod = this.indiv_to_comb(xc.add(xmove), yc.add(ymove));
    // console.log("next_pos_set", xc.add(xmove), yc.add(ymove), combined_mod, Poseidon.hash([salt, combined_mod]));
    this.P2_pos.set(Poseidon.hash([new_salt, combined_mod]));
  }

  //check the x and y is within the board size
  @method check_valid_pos(x: Field, y: Field) {
    // you need to input the raw x and y fields
    const step_size = this.step_size.get();
    this.step_size.assertEquals(step_size);
    const size = this.comb_to_indiv(step_size, Field(1));
    x.assertLessThan(size);
    y.assertLessThan(size);
    x.assertGreaterThanOrEqual(Field(0));
    y.assertGreaterThanOrEqual(Field(0));
  }

  //wait exactly 5 steps to attack again
  @method p1_attack_p2(x: Field, y: Field) {
    const step_size = this.step_size.get();
    this.step_size.assertEquals(step_size);
    const step = this.comb_to_indiv(this.step_size.get(), Field(0));
    const attack = Circuit.if(
      UInt32.from(step).mod(2).equals(UInt32.from(0)),
      Field(1),
      Field(0)
    );

    const P2attackedatXY = this.P2attackedatXY.get();
    this.P2attackedatXY.assertEquals(P2attackedatXY);

    this.P2attackedatXY.set(Circuit.if(attack.equals(Field(1)), this.indiv_to_comb(x, y), P2attackedatXY));

    const P1P2attacked = this.P1P2attacked.get();
    this.P1P2attacked.assertEquals(P1P2attacked);

    const p1 = this.comb_to_indiv(P1P2attacked, Field(0));
    const new_comb = this.indiv_to_comb(p1, Field(1));
    this.P1P2attacked.set(Circuit.if(attack.equals(Field(1)), new_comb, P1P2attacked));
  }

  @method p2_attack_p1(x: Field, y: Field) {
    const step_size = this.step_size.get();
    this.step_size.assertEquals(step_size);
    const step = this.comb_to_indiv(this.step_size.get(), Field(0));
    const attack = Circuit.if(
      UInt32.from(step).mod(2).equals(UInt32.from(0)),
      Field(1),
      Field(0)
    );

    const P1attackedatXY = this.P1attackedatXY.get();
    this.P1attackedatXY.assertEquals(P1attackedatXY);

    this.P1attackedatXY.set(Circuit.if(attack.equals(Field(1)), this.indiv_to_comb(x, y), P1attackedatXY));

    const P1P2attacked = this.P1P2attacked.get();
    this.P1P2attacked.assertEquals(P1P2attacked);

    const p2 = this.comb_to_indiv(P1P2attacked, Field(1));
    const new_comb = this.indiv_to_comb(Field(1), p2);
    this.P1P2attacked.set(Circuit.if(attack.equals(Field(1)), new_comb, P1P2attacked));
  }

  /**
   * Check if P1 has been attacked.
   * Decrement health by 2 if the player is attacked at the exact position and 1 if the player is attacked at a position within 1 manhattan distance
   * @param x The x position of the p1
   * @param y The y position of the p1
   */

  @method p1_check_if_attacked(x: Field, y: Field, salt: Field) {
    const curr_P1P2health = this.P1P2health.get();
    this.P1P2health.assertEquals(curr_P1P2health);

    const curr_P1attackedatXY = this.P1attackedatXY.get();
    this.P1attackedatXY.assertEquals(curr_P1attackedatXY);

    const curr_P1P2attacked = this.P1P2attacked.get();
    this.P1P2attacked.assertEquals(curr_P1P2attacked);

    const combined_input = this.indiv_to_comb(x, y);
    const curr_P1 = this.P1_pos.get();
    this.P1_pos.assertEquals(curr_P1);
    Poseidon.hash([salt, combined_input]).assertEquals(curr_P1);

    //Split the P1attackedXY into the two players
    const combInt = UInt32.from(curr_P1attackedatXY);
    const modnum = UInt32.from(Field(65536));
    const divmod = combInt.divMod(modnum);
    const P1attackedatX =  divmod.quotient.toFields()[0];
    const P1attackedatY = divmod.rest.toFields()[0];

    const xsub1 = P1attackedatX.sub(1);
    const ysub1 = P1attackedatY.sub(1);
    const xadd1 = P1attackedatX.add(1);
    const yadd1 = P1attackedatY.add(1);

    const cond1 = x.equals(P1attackedatX).and(y.equals(P1attackedatY));
    const cond2 = x.equals(xsub1).and(y.equals(P1attackedatY));
    const cond3 = x.equals(xadd1).and(y.equals(P1attackedatY));
    const cond4 = x.equals(P1attackedatX).and(y.equals(ysub1));
    const cond5 = x.equals(P1attackedatX).and(y.equals(yadd1));
    const damage = Circuit.switch(
      [
        cond1,
        cond2,
        cond3,
        cond4,
        cond5,
        cond1.or(cond2).or(cond3).or(cond4).or(cond5).not(),
      ],
      Field,
      [Field(2), Field(1), Field(1), Field(1), Field(1), Field(0)]
    );

    // Split the P1P2health into the two players
    const combInt2 = UInt32.from(curr_P1P2health);
    const divmod2 = combInt2.divMod(modnum);
    const curr_P1health = divmod2.quotient.toFields()[0]
    const curr_P2health = divmod2.rest.toFields()[0];

    //Split the P1P2attacked into the two players
    const combInt3 = UInt32.from(curr_P1P2attacked);
    const divmod3 = combInt3.divMod(modnum);
    const curr_P1attacked = divmod3.quotient.toFields()[0]
    const curr_P2attacked = divmod3.rest.toFields()[0];

    const mod_P1health = curr_P1health.sub(damage.mul(curr_P1attacked));
    this.P1P2health.set(this.indiv_to_comb(mod_P1health, curr_P2health));
    this.P1P2attacked.set(this.indiv_to_comb(Field(0), curr_P2attacked));
  }

  @method p2_check_if_attacked(x: Field, y: Field, salt: Field) {
    const curr_P1P2health = this.P1P2health.get();
    this.P1P2health.assertEquals(curr_P1P2health);

    const curr_P2attackedatXY = this.P2attackedatXY.get();
    this.P2attackedatXY.assertEquals(curr_P2attackedatXY);

    const curr_P1P2attacked = this.P1P2attacked.get();
    this.P1P2attacked.assertEquals(curr_P1P2attacked);

    const combined_input = this.indiv_to_comb(x, y);
    const curr_P2 = this.P2_pos.get();
    this.P2_pos.assertEquals(curr_P2);
    Poseidon.hash([salt, combined_input]).assertEquals(curr_P2);

    //Split the P2attackedXY into the two players
    const combInt = UInt32.from(curr_P2attackedatXY);
    const modnum = UInt32.from(Field(65536));
    const divmod = combInt.divMod(modnum);
    const P2attackedatX =  divmod.quotient.toFields()[0];
    const P2attackedatY = divmod.rest.toFields()[0];

    const xsub1 = P2attackedatX.sub(1);
    const ysub1 = P2attackedatY.sub(1);
    const xadd1 = P2attackedatX.add(1);
    const yadd1 = P2attackedatY.add(1);

    const cond1 = x.equals(P2attackedatX).and(y.equals(P2attackedatY));
    const cond2 = x.equals(xsub1).and(y.equals(P2attackedatY));
    const cond3 = x.equals(xadd1).and(y.equals(P2attackedatY));
    const cond4 = x.equals(P2attackedatX).and(y.equals(ysub1));
    const cond5 = x.equals(P2attackedatX).and(y.equals(yadd1));
    const damage = Circuit.switch(
      [
        cond1,
        cond2,
        cond3,
        cond4,
        cond5,
        cond1.or(cond2).or(cond3).or(cond4).or(cond5).not(),
      ],
      Field,
      [Field(2), Field(1), Field(1), Field(1), Field(1), Field(0)]
    );

    // Split the P1P2health into the two players
    const combInt2 = UInt32.from(curr_P1P2health);
    const divmod2 = combInt2.divMod(modnum);
    const curr_P1health = divmod2.quotient.toFields()[0]
    const curr_P2health = divmod2.rest.toFields()[0];

    //Split the P1P2attacked into the two players
    const combInt3 = UInt32.from(curr_P1P2attacked);
    const divmod3 = combInt3.divMod(modnum);
    const curr_P1attacked = divmod3.quotient.toFields()[0]
    const curr_P2attacked = divmod3.rest.toFields()[0];

    // console.log("health: ", curr_P1health, curr_P2health);
    // console.log("attacked: ", curr_P1attacked, curr_P2attacked);
    // console.log("P2attackedatXY: ", P2attackedatX, P2attackedatY);
    // console.log("curr xy: ", x, y);
    // console.log("damage: ", damage);

    const mod_P2health = curr_P2health.sub(damage.mul(curr_P2attacked));
    this.P1P2health.set(this.indiv_to_comb(curr_P1health, mod_P2health));
    this.P1P2attacked.set(this.indiv_to_comb(curr_P1attacked, Field(0)));
  }

  @method increment_step() {
    const step_size = this.step_size.get();
    this.step_size.assertEquals(step_size);
    const step = this.comb_to_indiv(step_size, Field(0));
    const size = this.comb_to_indiv(step_size, Field(1));
    this.step_size.set(this.indiv_to_comb(step.add(1), size));
  }


  /**
   * The player submerges into the water and can move 2 steps in the next turn
   * This special power is activated after 15 turns
   */
  @method p1_submerge(
    curr_x: Field,
    curr_y: Field,
    step1: Field,
    step2: Field,
    salt: Field
  ) {
    const d1 = step1.sub(Field(1));
    const d2 = step1.sub(Field(2));
    const d3 = step1.sub(Field(3));
    const d4 = step1.sub(Field(4));

    const step1x = Circuit.switch(
      [d1.isZero(), d2.isZero(), d3.isZero(), d4.isZero()],
      Field,
      [Field(0), Field(1), Field(0), Field(-1)]
    );

    const step1y = Circuit.switch(
      [d1.isZero(), d2.isZero(), d3.isZero(), d4.isZero()],
      Field,
      [Field(1), Field(0), Field(-1), Field(0)]
    );

    const d12 = step2.sub(Field(1));
    const d22 = step2.sub(Field(2));
    const d32 = step2.sub(Field(3));
    const d42 = step2.sub(Field(4));

    const step2x = Circuit.switch(
      [d12.isZero(), d22.isZero(), d32.isZero(), d42.isZero()],
      Field,
      [Field(0), Field(1), Field(0), Field(-1)]
    );

    const step2y = Circuit.switch(
      [d12.isZero(), d22.isZero(), d32.isZero(), d42.isZero()],
      Field,
      [Field(1), Field(0), Field(-1), Field(0)]
    );

    const P1P2_submerge_step = this.P1P2_submerge_step.get();
    this.P1P2_submerge_step.assertEquals(P1P2_submerge_step); 

    const step_size = this.step_size.get();
    this.step_size.assertEquals(step_size);
    const step = this.comb_to_indiv(step_size, Field(0));
    
    // Split the P1P2health into the two players
    const combInt2 = UInt32.from(P1P2_submerge_step);
    const modnum = UInt32.from(Field(65536));
    const divmod2 = combInt2.divMod(modnum);
    const P1_submerge_step = divmod2.quotient.toFields()[0];
    const P2_submerge_step = divmod2.rest.toFields()[0];

    const step_sub_bool = UInt32.from(step.sub(P1_submerge_step)).greaterThanOrEqual(UInt32.from(2));
    const submerge = Circuit.if(step_sub_bool, Field(1), Field(0));
    this.P1P2_submerge_step.set(
      Circuit.if(
        submerge.equals(Field(1)),
        this.indiv_to_comb(step, P2_submerge_step),
        P1P2_submerge_step
      )
    );
    
    let dx = step1x.add(step2x);
    let dy = step1y.add(step2y);
    dx = dx.mul(submerge);
    dy = dy.mul(submerge);

    const combined_input = this.indiv_to_comb(curr_x, curr_y);
    const curr_P1 = this.P1_pos.get();
    this.P1_pos.assertEquals(curr_P1);
    Poseidon.hash([salt, combined_input]).assertEquals(curr_P1);

    const combined_mod = this.indiv_to_comb(curr_x.add(Field(dx)), curr_y.add(Field(dy)));
    this.P1_pos.set(Poseidon.hash([salt, combined_mod]));
  }

  @method p2_submerge(
    curr_x: Field,
    curr_y: Field,
    step1: Field,
    step2: Field,
    salt: Field
  ) {
    const d1 = step1.sub(Field(1));
    const d2 = step1.sub(Field(2));
    const d3 = step1.sub(Field(3));
    const d4 = step1.sub(Field(4));

    const step1x = Circuit.switch(
      [d1.isZero(), d2.isZero(), d3.isZero(), d4.isZero()],
      Field,
      [Field(0), Field(1), Field(0), Field(-1)]
    );

    const step1y = Circuit.switch(
      [d1.isZero(), d2.isZero(), d3.isZero(), d4.isZero()],
      Field,
      [Field(1), Field(0), Field(-1), Field(0)]
    );

    const d12 = step2.sub(Field(1));
    const d22 = step2.sub(Field(2));
    const d32 = step2.sub(Field(3));
    const d42 = step2.sub(Field(4));

    const step2x = Circuit.switch(
      [d12.isZero(), d22.isZero(), d32.isZero(), d42.isZero()],
      Field,
      [Field(0), Field(1), Field(0), Field(-1)]
    );

    const step2y = Circuit.switch(
      [d12.isZero(), d22.isZero(), d32.isZero(), d42.isZero()],
      Field,
      [Field(1), Field(0), Field(-1), Field(0)]
    );

    const P1P2_submerge_step = this.P1P2_submerge_step.get();
    this.P1P2_submerge_step.assertEquals(P1P2_submerge_step); 

    const step_size = this.step_size.get();
    this.step_size.assertEquals(step_size);
    const step = this.comb_to_indiv(step_size, Field(0));
    
    // Split the P1P2health into the two players
    const combInt2 = UInt32.from(P1P2_submerge_step);
    const modnum = UInt32.from(Field(65536));
    const divmod2 = combInt2.divMod(modnum);
    const P1_submerge_step = divmod2.quotient.toFields()[0];
    const P2_submerge_step = divmod2.rest.toFields()[0];

    const step_sub_bool = UInt32.from(step.sub(P2_submerge_step)).greaterThanOrEqual(UInt32.from(2));
    const submerge = Circuit.if(step_sub_bool, Field(1), Field(0));
    this.P1P2_submerge_step.set(
      Circuit.if(
        submerge.equals(Field(1)),
        this.indiv_to_comb(P1_submerge_step, step),
        P1P2_submerge_step
      )
    );
    
    let dx = step1x.add(step2x);
    let dy = step1y.add(step2y);
    dx = dx.mul(submerge);
    dy = dy.mul(submerge);

    const combined_input = this.indiv_to_comb(curr_x, curr_y);
    const curr_P2 = this.P2_pos.get();
    this.P2_pos.assertEquals(curr_P2);
    Poseidon.hash([salt, combined_input]).assertEquals(curr_P2);

    const combined_mod = this.indiv_to_comb(curr_x.add(Field(dx)), curr_y.add(Field(dy)));
    this.P2_pos.set(Poseidon.hash([salt, combined_mod]));
  }
}
