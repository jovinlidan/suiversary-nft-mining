/* eslint-disable no-constant-condition */
import {
  SUI_CLOCK_OBJECT_ID,
  SUI_TYPE_ARG,
  SuiKit,
  SuiTxBlock,
} from "@scallop-io/sui-kit";
import { SuiObjectRef } from "@mysten/sui.js/client";
import { contract } from "../contract/mainnet";
import { AddNewLog } from "../type";

type Coin = {
  value: string;
} & SuiObjectRef;

const refetchGas = async (gas: Coin, suiKit: SuiKit): Promise<Coin> => {
  const resp = await suiKit.client().getObject({ id: gas.objectId });
  return {
    objectId: resp.data!.objectId,
    version: resp.data!.version,
    digest: resp.data!.digest,
    value: gas.value,
  };
};

const submitProof = async (
  coin: Coin,
  gas: Coin,
  suiKit: SuiKit,
  addNewLog: AddNewLog
) => {
  try {
    const txb = new SuiTxBlock();
    txb.setGasPayment([
      { objectId: gas.objectId, version: gas.version, digest: gas.digest },
    ]);

    const coinValue = parseInt(coin.value);
    if (coinValue < 1e9) {
      const newValue = txb.splitCoins(txb.gas, [1e9 - coinValue])[0];
      txb.mergeCoins(coin.objectId, [newValue]);
    } else if (coinValue > 1e9) {
      const removedValue = txb.splitCoins(coin.objectId, [coinValue - 1e9])[0];
      txb.transferObjects([removedValue], suiKit.currentAddress());
    }

    txb.moveCall(
      `${contract.packageId}::suiversary::mint_pow`,
      [
        txb.object(contract.registryId),
        txb.object(coin.objectId),
        txb.object(SUI_CLOCK_OBJECT_ID),
      ],
      []
    );
    return suiKit.signAndSendTxn(txb);
  } catch (e) {
    addNewLog({
      message: `Error when submitting proof: ${JSON.stringify(e)}`,
      isError: true,
    });
  }
};

export const splitObjects = async (
  suiKit: SuiKit,
  addNewLog: AddNewLog,
  isRunning: React.MutableRefObject<boolean>
) => {
  try {
    do {
      const txb = new SuiTxBlock();
      const array = new Array(500);
      array.fill(1);
      let arr = txb.splitCoins(txb.gas, array);
      txb.transferObjects(arr, suiKit.currentAddress());
      arr = txb.splitCoins(txb.gas, array);
      txb.transferObjects(arr, suiKit.currentAddress());
      txb.setSender(suiKit.currentAddress());

      const txBytes = await txb.build({
        client: suiKit.client(),
      });

      const resp = await suiKit.client().dryRunTransactionBlock({
        transactionBlock: txBytes,
      });

      let ok = false;
      for (const changes of resp.objectChanges) {
        if (changes.type === "created") {
          if (changes.objectId.startsWith("0x0000")) {
            addNewLog({
              message: `Hash Found: ${changes.objectId}`,
              color: "bg-green",
            });
            ok = true;
          } else if (changes.objectId.startsWith("0x00")) {
            addNewLog({
              message: `Almost rare: ${changes.objectId}`,
              color: "gray",
            });
          }
        }
      }

      if (ok) {
        const resp = await suiKit.signAndSendTxn(txBytes);
        addNewLog({
          message: `Creating hash: ${resp.digest}`,
          color: "blue",
        });
        break;
      } else {
        addNewLog({
          message: "No rare hash found.",
          color: "yellow",
        });

        const txb = new SuiTxBlock();
        const resp = await suiKit.signAndSendTxn(txb);
        addNewLog({
          message: `Updating version: ${resp.digest}`,
          color: "blue",
        });
      }
    } while (isRunning.current);
  } catch (e) {
    addNewLog({
      message: `Error when splitting objects: ${JSON.stringify(e)}`,
      isError: true,
    });
    throw e;
  }
};

const mergeObjects = async (
  coins: Array<Coin>,
  gas: Coin,
  suiKit: SuiKit,
  addNewLog: AddNewLog
) => {
  try {
    while (coins.length > 1) {
      const txb = new SuiTxBlock();
      txb.setGasPayment([
        {
          objectId: gas.objectId,
          version: gas.version,
          digest: gas.digest,
        },
      ]);

      const subarr = coins.splice(1, 500);
      const objectIds = subarr.map((coin) => txb.object(coin.objectId));
      txb.mergeCoins(txb.gas, objectIds);

      if (coins.length > 2) {
        const subarr = coins.splice(1, 500);
        const objectIds = subarr.map((coin) => txb.object(coin.objectId));
        txb.mergeCoins(txb.gas, objectIds);
      }

      const resp = await suiKit.signAndSendTxn(txb);

      gas = await refetchGas(gas, suiKit);
      addNewLog({
        message: `Objects merged: ${resp.digest}`,
        color: "blue",
      });
    }
  } catch (e) {
    addNewLog({
      message: `Error when merging objects: ${JSON.stringify(e)}`,
      isError: true,
    });
    throw e;
  }
};

export const observeObjects = async (suiKit: SuiKit, addNewLog: AddNewLog) => {
  try {
    const coins = new Array<Coin>();

    let cursor = null;
    do {
      const resp = await suiKit.client().getCoins({
        owner: suiKit.currentAddress(),
        coinType: SUI_TYPE_ARG,
        cursor: cursor,
        limit: 100,
      });
      resp.data.map((data) => {
        coins.push({
          objectId: data.coinObjectId,
          version: data.version,
          digest: data.digest,
          value: data.balance,
        });
      });
      cursor = resp.nextCursor;
    } while (cursor !== null);

    let gas = coins[0];
    let gasIndex = 0;
    for (let i = 1; i < coins.length; i++) {
      if (parseInt(coins[i].value) > parseInt(gas.value)) {
        gas = coins[i];
        gasIndex = i;
      }
    }

    coins.splice(gasIndex, 1);

    let counter = 0;
    for (let i = 0; i < coins.length; i++) {
      const coin = coins[i];
      if (coin.objectId.startsWith("0x0000")) {
        const resp = await submitProof(coin, gas, suiKit, addNewLog);
        gas = await refetchGas(gas, suiKit);
        addNewLog({
          message: `Proof submitted: ${resp?.digest}`,
          color: "green",
        });
        coins.splice(i--, 1);
        counter++;
      }
    }

    if (counter > 0) {
      addNewLog({
        message: `${counter} proofs submitted! NFT minted!`,
        color: "green",
      });
    } else {
      addNewLog({
        message: "No proof submitted",
        color: "yellow",
      });
    }

    await mergeObjects(coins, gas, suiKit, addNewLog);
  } catch (e) {
    addNewLog({
      message: `Error when observing objects: ${JSON.stringify(e)}`,
      isError: true,
    });
    throw e;
  }
};
