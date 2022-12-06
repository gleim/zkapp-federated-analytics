/*
 * This file specifies how to test the `FedAvg` example smart contract.
 */

import { FedAvg, FedAvgZkProgram } from './FedAvg';

import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  AccountUpdate,
} from 'snarkyjs';

// wait for snarkyjs to be available
await isReady;

// wait for recursion function to compile
await FedAvgZkProgram.compile();

// use the recursive program to create a proof
const proof = await FedAvgZkProgram.baseCase(Field(0));
console.log('Proof: ', proof);

const proof1 = await FedAvgZkProgram.step(Field(1), proof);
console.log('Proof1: ', proof1);

const proof2 = await FedAvgZkProgram.step(Field(2), proof1);
console.log('Proof2: ', proof2);

describe('FedAvg', () => {
  let deployerAccount: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: FedAvg;

  beforeAll(async () => {
    await isReady;
    await FedAvg.compile();
  });

  beforeEach(() => {
    const Local = Mina.LocalBlockchain();
    Mina.setActiveInstance(Local);
    deployerAccount = Local.testAccounts[0].privateKey;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new FedAvg(zkAppAddress);
  });

  afterAll(() => {
    // `shutdown()` internally calls `process.exit()` which will exit the running Jest process early.
    // Specifying a timeout of 0 is a workaround to defer `shutdown()` until Jest is done running all tests.
    // This should be fixed with https://github.com/MinaProtocol/mina/issues/10943
    setTimeout(shutdown, 0);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([zkAppPrivateKey]).send();
  }

  it('generates and deploys the `FedAvg` smart contract', async () => {
    await localDeploy();
    const num = zkApp.num.get();
    expect(num).toEqual(Field(0));
  });

  it('verifies the `FedAvg` base case operation', async () => {
    await localDeploy();

    zkApp.verifyProof(proof);

    expect(zkApp.num.get()).toEqual(Field(0));
  });

  it('verifies the first `FedAvg` step operation', async () => {
    await localDeploy();

    zkApp.verifyProof(proof1);

    expect(true).toEqual(true);
  });
});
