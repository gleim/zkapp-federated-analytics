/**
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with npx:      `$ npx snarky-run src/SumReducer.ts`
 *
 */

import {
  Field,
  state,
  State,
  method,
  PrivateKey,
  SmartContract,
  Mina,
  AccountUpdate,
  isReady,
  Permissions,
  Reducer,
} from 'snarkyjs';

await isReady;

class SumReducer extends SmartContract {
  // the "reducer" field describes a type of action that we can dispatch, and reduce later
  reducer = Reducer({ actionType: Field });

  // on-chain version of our state. it will typically lag behind the
  // version that's implicitly represented by the list of actions
  @state(Field) counter = State<Field>();
  @state(Field) rollingSum = State<Field>();
  // helper field to store the point in the action history that our on-chain state is at
  @state(Field) actionsHash = State<Field>();

  @method addToSum(addend: Field) {
    this.reducer.dispatch(addend);
  }

  @method rollupSum() {
    // get previous state values, assert that they're the same as on-chain values
    let counter = this.counter.get();
    this.counter.assertEquals(counter);
    let rollingSum = this.rollingSum.get();
    this.rollingSum.assertEquals(rollingSum);
    let actionsHash = this.actionsHash.get();
    this.actionsHash.assertEquals(actionsHash);

    // compute the new counter and hash from pending actions
    let pendingActions = this.reducer.getActions({
      fromActionHash: actionsHash,
    });

    let { state: newRollingSum, actionsHash: newActionsHash } =
      this.reducer.reduce(
        pendingActions,
        // state type
        Field,
        // function that says how to apply an action
        (state: Field, _action: Field) => {
          return state.add(_action);
        },
        { state: rollingSum, actionsHash }
      );

    let { state: newCounter } = this.reducer.reduce(
      pendingActions,
      // state type
      Field,
      // function that says how to apply an action
      (state: Field) => {
        return state.add(1);
      },
      { state: counter, actionsHash }
    );

    // update on-chain state
    this.counter.set(newCounter);
    this.rollingSum.set(newRollingSum);
    this.actionsHash.set(newActionsHash);
  }
}

const doProofs = true;
const initialCounter = Field(0);

let Local = Mina.LocalBlockchain();
Mina.setActiveInstance(Local);

// a test account that pays all the fees, and puts additional funds into the zkapp
let feePayer = Local.testAccounts[0].privateKey;

// the zkapp account
let zkappKey = PrivateKey.fromBase58(
  'EKEQc95PPQZnMY9d9p1vq1MWLeDJKtvKj4V75UDG3rjnf32BerWD'
);
let zkappAddress = zkappKey.toPublicKey();
let zkapp = new SumReducer(zkappAddress);
if (doProofs) {
  console.log('compile');
  await SumReducer.compile();
}

console.log('deploy');
let tx = await Mina.transaction(feePayer, () => {
  AccountUpdate.fundNewAccount(feePayer);
  zkapp.deploy({ zkappKey });
  if (!doProofs) {
    zkapp.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editSequenceState: Permissions.proofOrSignature(),
    });
  }
  zkapp.counter.set(initialCounter);
  zkapp.actionsHash.set(Reducer.initialActionsHash);
});
await tx.send();

console.log('Initiating summation of numerical fields');

console.log('Addition of field 1');
tx = await Mina.transaction(feePayer, () => {
  zkapp.addToSum(Field(5));
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
await tx.send();

console.log('Addition of field 2');
tx = await Mina.transaction(feePayer, () => {
  zkapp.addToSum(Field(10));
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
await tx.send();

console.log('Addition of field 3');
tx = await Mina.transaction(feePayer, () => {
  zkapp.addToSum(Field(12));
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
await tx.send();

console.log('counter    before Sum rollup: ' + zkapp.counter.get());
console.log('rollingSum before Sum rollup: ' + zkapp.rollingSum.get());

tx = await Mina.transaction(feePayer, () => {
  zkapp.rollupSum();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
await tx.send();

console.log('counter    after Sum rollup: ' + zkapp.counter.get());
console.log('rollingSum after Sum rollup: ' + zkapp.rollingSum.get());

console.log('next stage of Sum activity:');

console.log('Addition of field 4');
tx = await Mina.transaction(feePayer, () => {
  zkapp.addToSum(Field(8));
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
await tx.send();

console.log('Addition of field 5');
tx = await Mina.transaction(feePayer, () => {
  zkapp.addToSum(Field(3));
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
await tx.send();

console.log('Addition of field 6');
tx = await Mina.transaction(feePayer, () => {
  zkapp.addToSum(Field(4));
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
await tx.send();

console.log('rolling up final Sum');

console.log('counter    before Sum rollup: ' + zkapp.counter.get());
console.log('rollingSum before Sum rollup: ' + zkapp.rollingSum.get());

tx = await Mina.transaction(feePayer, () => {
  zkapp.rollupSum();
  if (!doProofs) zkapp.sign(zkappKey);
});
if (doProofs) await tx.prove();
await tx.send();

console.log('counter    after Sum rollup: ' + zkapp.counter.get());
console.log('rollingSum after Sum rollup: ' + zkapp.rollingSum.get());
