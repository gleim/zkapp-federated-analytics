import { Field, Experimental, SelfProof } from 'snarkyjs';

export const ProofOfComputeSequence = Experimental.ZkProgram({
  publicInput: Field,

  methods: {
    baseCase: {
      privateInputs: [],

      method(publicInput: Field) {
        // base case
        publicInput;
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
