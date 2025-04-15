import { ApiPromise, WsProvider } from '@polkadot/api';

const NODE_URL = 'wss://api.testnet.torus.network';

export const connectToChainRpc = async () => {
  const wsProvider = new WsProvider(NODE_URL);
  const api = await ApiPromise.create({ provider: wsProvider });

  if (!api.isConnected) {
    throw new Error('API not connected');
  }

  return api;
};

export type Helpers = {
  checkTransaction: (blockHash: string) => Promise<any>;
};

export const checkTransaction =
  (api: ApiPromise) => async (blockHash: string) => {
    const signedBlock = await api.rpc.chain.getBlock(blockHash);

    const apiAt = await api.at(signedBlock.block.header.hash);
    const allRecords = await apiAt.query.system.events();

    let isValid = false;

    signedBlock.block.extrinsics.forEach((_, index) => {
      allRecords
        // @ts-ignore
        .filter(
          // @ts-ignore
          ({ phase }) =>
            phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(index),
        )
        // @ts-ignore
        .forEach(({ event }) => {
          const success = api.events.system.ExtrinsicSuccess.is(event);
          const failed = api.events.system.ExtrinsicFailed.is(event);

          if (success) {
            isValid = true;
          }

          if (failed) {
            isValid = false;
          }
        });
    });

    return { isValid };
  };
