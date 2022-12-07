import {
  Field,
  Experimental,
  SmartContract,
  SelfProof,
  State,
  method,
  state,
} from 'snarkyjs';

export const FedAvgZkProgram = Experimental.ZkProgram({
  publicInput: Field,

  methods: {
    baseCase: {
      privateInputs: [],

      method(publicInput: Field) {
        publicInput.assertEquals(Field(0));
      },
    },

    step: {
      privateInputs: [SelfProof],

      method(publicInput: Field, earlierProof: SelfProof<Field>) {
        earlierProof.verify();
      },
    },
  },
});

export class FedAvg extends SmartContract {
  @state(Field) num = State<Field>();

  init() {
    super.init();
    this.num.set(Field(0));
  }

  @method add(x: Field) {
    const currentState = this.num.get();
    this.num.assertEquals(currentState); // precondition that links this.num.get() to the actual on-chain state
    const newState = currentState.add(x).div(2); // rolling average
    this.num.set(newState);
  }

  @method verifyProof(proof: SelfProof<Field>) {
    proof.verify();
  }
}
