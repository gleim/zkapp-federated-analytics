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

// use the recursive program to create a proof
//const proof = await FedAvgZkProgram.baseCase(Field(0));

describe('FedAvg', () => {
  let deployerAccount: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: FedAvg;

  beforeAll(async () => {
    await isReady;
    await FedAvgZkProgram.compile();
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
});
