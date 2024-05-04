/* eslint-disable no-constant-condition */
import suiversaryNft from "/suiversary.png";
import "./App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { encodeKey, generateWallet } from "./utils/sui";
import { SUI_TYPE_ARG, SuiKit } from "@scallop-io/sui-kit";
import BigNumber from "bignumber.js";
import { observeObjects, splitObjects } from "./utils/mining";

function App() {
  const [account, setAccount] = useState<{
    address: string;
    privateKey: string;
  }>();
  const [suiKit, setSuiKit] = useState<SuiKit>();
  const [suiBalance, setSuiBalance] = useState<string>("0");
  const [objectCount, setObjectCount] = useState<{
    found: number;
    total: number;
  }>({ found: 0, total: 0 });
  // const [logs, setLogs] = useState<string[]>([]);
  const [recalculate, setRecalculate] = useState(0);
  const [loading, setLoading] = useState<boolean>(false);
  const isRunning = useRef(false);

  useEffect(() => {
    document.title = "Suiversary NFT Mining";
  }, []);

  useEffect(() => {
    const cachedAccount = localStorage.getItem("account");
    if (cachedAccount) {
      const newAccount = generateWallet(encodeKey(JSON.parse(cachedAccount)));
      setAccount(newAccount);
      setSuiKit(
        new SuiKit({ secretKey: newAccount.privateKey, networkType: "mainnet" })
      );
      return;
    }
    const newAccount = generateWallet();
    localStorage.setItem("account", JSON.stringify(newAccount.privateKey));
    setAccount(newAccount);
    setSuiKit(
      new SuiKit({ secretKey: newAccount.privateKey, networkType: "mainnet" })
    );
  }, []);

  useEffect(() => {
    if (!suiKit) return;
    const getSuiBalance = async () => {
      const balance = await suiKit.getBalance(SUI_TYPE_ARG);
      setSuiBalance(BigNumber(balance.totalBalance).shiftedBy(-9).toString());
    };
    const getSuiObject = async () => {
      let nextCursor = undefined;
      let countTotal = 0;
      let countFound = 0;
      while (true) {
        const objects = await suiKit.client().getCoins({
          owner: suiKit.currentAddress(),
          coinType: SUI_TYPE_ARG,
          cursor: nextCursor,
          limit: 100000,
        });
        objects.data.forEach((object) => {
          if (object.coinObjectId.startsWith("0x0000")) {
            countFound++;
            countTotal++;
          } else {
            countTotal++;
          }
        });
        if (!objects.hasNextPage) {
          setObjectCount({ found: countFound, total: countTotal });
          break;
        }
        nextCursor = objects.nextCursor;
      }
    };
    getSuiBalance();
    getSuiObject();
  }, [suiKit, recalculate]);

  const handleMining = useCallback(async () => {
    if (!suiKit) return;
    setLoading(true);
    isRunning.current = true;
    while (isRunning.current) {
      await observeObjects(suiKit);
      await splitObjects(suiKit);
      setRecalculate((prev) => prev + 1);
      console.log("finish...", isRunning.current);
    }
  }, [suiKit]);

  if (!suiKit) return null;
  return (
    <div className="home-page">
      <h1 className="title">HAPPY SUI 1ST ANNIVERSARY</h1>

      <div className="infos">
        <span>SUI Balance: {suiBalance} SUI</span>
        <span>SUI Objects: {objectCount.total}</span>
        <span>Found Object: {objectCount.found}</span>
        <div className="buttons">
          <button onClick={handleMining}>
            {loading ? "Mining..." : "Mining"}
          </button>
          {loading && (
            <button
              className="cancel"
              onClick={() => {
                isRunning.current = false;
                setLoading(false);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="inputs">
        <input
          type="text"
          placeholder="User Address"
          className="user-address"
          readOnly
          value={account?.address}
        />
        <input
          type="text"
          placeholder="Private Key"
          className="private-key"
          readOnly
          value={account?.privateKey}
        />
      </div>

      <div className="how-to-play">
        <h2>How to Play</h2>
        <p>
          Click Mining button it will try to mining object id that has prefix
          0x0000.
        </p>
        <p>
          After you got the object submit the object and you will got special
          NFT below.
        </p>
        <img src={suiversaryNft} alt="suiversary-nft" />
      </div>
    </div>
  );
}

export default App;
