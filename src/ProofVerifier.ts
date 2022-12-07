import { Field, SmartContract, SelfProof, method } from 'snarkyjs';

export class ProofVerifier extends SmartContract {
  init() {
    super.init();
  }

  @method verifyProof(proof: SelfProof<Field>) {
    proof.verify();
  }
}
