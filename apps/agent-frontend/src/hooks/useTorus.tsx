import { useCallback, useEffect, useState } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';
import type {
  InjectedAccountWithMeta,
  InjectedExtension,
} from '@polkadot/extension-inject/types';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { stringToHex, u8aToHex } from '@polkadot/util';
import { merkleizeMetadata } from '@polkadot-api/merkleize-metadata';

export interface TorusApiState {
  web3Accounts: (() => Promise<InjectedAccountWithMeta[]>) | null;
  web3Enable: ((appName: string) => Promise<InjectedExtension[]>) | null;
  web3FromAddress: ((address: string) => Promise<InjectedExtension>) | null;
}

function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    ''
  );
}

async function getMetadataProof(api: ApiPromise) {
  const metadata = await api.call.metadata.metadataAtVersion(15);
  const { specName, specVersion } = api.runtimeVersion;

  const merkleizedMetadata = merkleizeMetadata(metadata.toHex(), {
    // @ts-ignore
    base58Prefix: api.consts.system.ss58Prefix.toNumber(),
    decimals: 18,
    specName: specName.toString(),
    specVersion: specVersion.toNumber(),
    tokenSymbol: 'TORUS',
  });

  const metadataHash = u8aToHex(merkleizedMetadata.digest());
  console.log('Generated metadata hash:', metadataHash);

  return {
    metadataHash,
    merkleizedMetadata,
  };
}

export function toNano(standardValue: number | string): bigint {
  const [integerPart, fractionalPart = ''] = standardValue
    .toString()
    .split('.');
  const paddedFractionalPart = fractionalPart.padEnd(18, '0');
  const nanoValue = `${integerPart}${paddedFractionalPart}`;
  return BigInt(nanoValue);
}

export function createAuthReqData(uri: string) {
  return {
    statement: `Sign in with Polkadot extension to authenticate your session at ${uri}`,
    uri,
    nonce: generateNonce(),
    created: new Date().toISOString(),
  };
}

export const useTorus = ({
  wsEndpoint = 'wss://api.testnet.torus.network',
}: {
  wsEndpoint?: string;
} = {}) => {
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [torusApi, setTorusApi] = useState<TorusApiState | null>(null);

  const loadTorusApi = useCallback(async () => {
    const { web3Accounts, web3Enable, web3FromAddress } = await import(
      '@polkadot/extension-dapp'
    );

    setTorusApi({
      web3Enable,
      web3Accounts,
      web3FromAddress,
    });

    const provider = new WsProvider(wsEndpoint);
    const newApi = await ApiPromise.create({ provider });
    setApi(newApi);
    setIsLoading(false);
  }, [wsEndpoint]);

  useEffect(() => {
    void loadTorusApi();
  }, [loadTorusApi]);

  async function getWallets(): Promise<InjectedAccountWithMeta[] | undefined> {
    if (!torusApi?.web3Enable || !torusApi.web3Accounts || !api) return;

    await torusApi?.web3Enable('Torus Network');

    try {
      const accounts = await torusApi.web3Accounts();

      const accountsWithFreeBalance = await Promise.all(
        accounts.map(async (account) => {
          const balance = await api.query.system.account(account.address);
          const balanceJson = balance.toJSON();
          if (
            balanceJson &&
            typeof balanceJson === 'object' &&
            'data' in balanceJson
          ) {
            return {
              ...account,
              // @ts-ignore
              freeBalance: balanceJson?.data?.free,
            };
          }
          return {
            ...account,
            freeBalance: 0n,
          };
        })
      );

      return accountsWithFreeBalance;
    } catch {
      return undefined;
    }
  }

  async function generateAuthReq(
    selectedAccount: InjectedAccountWithMeta
  ): Promise<{
    payload: `0x${string}`;
    signature: `0x${string}`;
    address: string;
  }> {
    await cryptoWaitReady();

    if (!torusApi?.web3FromAddress) {
      throw new Error('No selected account');
    }

    const injector = await torusApi.web3FromAddress(selectedAccount.address);

    if (!injector.signer.signRaw) {
      throw new Error('Signer does not support signRaw');
    }

    const msgHex = stringToHex(
      JSON.stringify(createAuthReqData('http://localhost:5173'))
    );

    const result = await injector.signer.signRaw({
      address: selectedAccount.address,
      data: msgHex,
      type: 'bytes',
    });

    return {
      payload: msgHex,
      signature: result.signature,
      address: selectedAccount.address,
    };
  }

  type Callback = ({
    status,
    isFinalized,
    message,
    blockHash,
    transactionHash,
  }: {
    status: 'completed' | 'pending' | 'failed';
    isFinalized: boolean;
    message: string;
    blockHash?: `0x${string}`;
    transactionHash?: `0x${string}`;
  }) => void;

  const transferTransaction = async ({
    from,
    to,
    amount,
    callback,
  }: {
    from?: string;
    to?: string;
    amount: string;
    callback?: Callback;
  }) => {
    if (!from || !to) {
      callback?.({
        status: 'failed',
        message: 'Failed to create transaction (1)',
        isFinalized: false,
      });

      return;
    }

    if (!api) {
      callback?.({
        status: 'failed',
        message: 'Failed to create transaction (2)',
        isFinalized: false,
      });

      return;
    }

    const transaction = api.tx.balances.transferAllowDeath(to, toNano(amount));

    if (!transaction || !torusApi?.web3FromAddress || !torusApi?.web3Enable) {
      callback?.({
        status: 'failed',
        message: 'Failed to create transaction (3)',
        isFinalized: false,
      });

      return;
    }

    try {
      await torusApi?.web3Enable('Torus Network');
      const injector = await torusApi.web3FromAddress(from);
      const { metadataHash } = await getMetadataProof(api);

      const txOptions = {
        signer: injector.signer,
        tip: 0,
        nonce: -1,
        mode: 1,
        metadataHash,
        signedExtensions: api.registry.signedExtensions,
        withSignedTransaction: true,
      };

      await transaction.signAndSend(from, txOptions, (result) => {
        if (result.status.isReady) {
          callback?.({
            status: 'pending',
            message: 'Transaction is ready',
            isFinalized: false,
          });
        }

        if (result.status.isBroadcast) {
          callback?.({
            status: 'pending',
            message: 'Transaction is broadcasted',
            isFinalized: false,
          });
        }

        if (result.status.isInBlock) {
          callback?.({
            status: 'pending',
            message: 'Transaction is in block',
            isFinalized: false,
          });
        }

        if (result.status.isFinalized) {
          const success = result.findRecord('system', 'ExtrinsicSuccess');
          const failed = result.findRecord('system', 'ExtrinsicFailed');
          const blockHash = result.status.asFinalized.toHex();

          if (success) {
            callback?.({
              status: 'completed',
              message: 'Transaction is finalized',
              isFinalized: true,
              blockHash,
              transactionHash: transaction.toHex(),
            });
          }

          if (failed) {
            callback?.({
              status: 'failed',
              message: 'Transaction failed',
              isFinalized: false,
            });
          }
        }
      });
    } catch (error) {
      callback?.({
        status: 'failed',
        message: 'Failed to create transaction (4)',
        isFinalized: false,
      });
    }
  };

  return {
    torusApi,
    getWallets,
    generateAuthReq,
    isLoading,
    transferTransaction,
  };
};
