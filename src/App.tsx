/* eslint-disable no-constant-condition */
import suiversaryNft from "/suiversary.png";
import "./App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { generateWallet } from "./utils/sui";
import { SUI_TYPE_ARG, SuiKit } from "@scallop-io/sui-kit";
import BigNumber from "bignumber.js";
import { observeObjects, splitObjects } from "./utils/mining";
import eyeOpen from "./assets/eye-open.svg";
import eyeClose from "./assets/eye-close.svg";
import { Log, LogInput } from "./type";
import MemoizedCopyIcon from "./components/copy-icon";
import classNames from "classnames";
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
  const [recalculate, setRecalculate] = useState(0);
  const [loading, setLoading] = useState<boolean>(false);
  const isRunning = useRef(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const logsListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cachedAccount = localStorage.getItem("account");
    if (cachedAccount) {
      const newAccount = generateWallet(JSON.parse(cachedAccount));
      setAccount(newAccount);
      setSuiKit(
        new SuiKit({ secretKey: newAccount.privateKey, networkType: "mainnet" })
      );
      if (JSON.parse(cachedAccount) !== newAccount.privateKey) {
        localStorage.setItem("account", JSON.stringify(newAccount.privateKey));
      }
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
  const addNewLog = useCallback((log: LogInput) => {
    setLogs((prev) => [...prev, { timestamp: Date.now(), ...log }]);
  }, []);

  const handleMining = useCallback(async () => {
    if (!suiKit) return;
    try {
      setLoading(true);
      isRunning.current = true;
      while (isRunning.current) {
        await observeObjects(suiKit, addNewLog);
        await splitObjects(suiKit, addNewLog, isRunning);
        setRecalculate((prev) => prev + 1);

        addNewLog({ message: `Running state: ${isRunning.current}` });
        if (!isRunning.current) {
          addNewLog({ message: "Minting Stopped", isError: true });
          setLoading(false);
          setTimeout(() => {
            logsListRef.current?.scrollTo({
              behavior: "smooth",
              top:
                logsListRef.current.scrollTop +
                logsListRef.current.scrollHeight,
            });
          }, 200);
        }
      }
    } catch (e) {
      isRunning.current = false;
      setLoading(false);
    }
  }, [suiKit, addNewLog]);

  useEffect(() => {
    if (isRunning.current) {
      logsListRef.current?.scrollTo({
        behavior: "smooth",
        top: logsListRef.current.scrollTop + logsListRef.current.scrollHeight,
      });
    }
  }, [logs, loading]);

  if (!suiKit) return null;
  return (
    <div className="home-page">
      <h1 className="title">HAPPY SUI 1ST ANNIVERSARY</h1>

      <div className="infos">
        <span>SUI Balance: {suiBalance} SUI</span>
        <span>SUI Objects: {objectCount.total}</span>
        <span>Found Object: {objectCount.found}</span>
        <div className="buttons">
          {!(loading && !isRunning.current) && (
            <button
              onClick={handleMining}
              // disabled={suiBalance === "0"}
              disabled
            >
              {/* {suiBalance === "0"
                ? "Please top up your address with SUI"
                : loading
                ? "Mining..."
                : "Mining"} */}
              Mining Ended 110/110
            </button>
          )}
          {loading && (
            <button
              className="cancel"
              onClick={() => {
                if (loading && !isRunning.current) return;
                isRunning.current = false;
                addNewLog({ message: "Mining has been canceled. Stopping..." });
              }}
            >
              {loading && !isRunning.current ? "Cancelling" : "Cancel"}
            </button>
          )}
        </div>
      </div>

      <div className="inputs">
        <div>
          <label>Address</label>
          <div>
            <span className="user-address">{account?.address}</span>
            <MemoizedCopyIcon text={account?.address} />
          </div>
        </div>
        <div>
          <label>Private Key</label>
          <div>
            <span className="private-key">
              {showPrivateKey ? account?.privateKey : "*".repeat(32)}
            </span>

            <img
              src={showPrivateKey ? eyeOpen : eyeClose}
              alt="show-private-key"
              onClick={() => setShowPrivateKey((prev) => !prev)}
            />
            <MemoizedCopyIcon text={account?.privateKey} />
          </div>
        </div>
      </div>

      <div className="logs">
        <h2>Logs</h2>
        <div ref={logsListRef}>
          {logs.map((log, index) => (
            <span key={index}>
              <span>{new Date(log.timestamp).toLocaleString()}:&nbsp;</span>
              <p className={classNames(log.color, log.isError ? "error" : "")}>
                {log.message}
              </p>
            </span>
          ))}
          {logs.length === 0 && <p>No logs available</p>}
          {logs.length > 0 && !loading && !isRunning.current && (
            <button
              className="clear-logs"
              onClick={() => {
                setLogs([]);
              }}
            >
              Clear Logs
            </button>
          )}
        </div>
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
