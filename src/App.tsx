import suiversaryNft from "/suiversary.png";
import "./App.css";
import { useEffect, useState } from "react";
import { generateWallet } from "./utils/sui";

function App() {
  const [account, setAccount] = useState<{
    address: string;
    privateKey: string;
  }>();

  useEffect(() => {
    document.title = "Suiversary NFT Mining";
  }, []);

  useEffect(() => {
    const cachedAccount = localStorage.getItem("account");
    if (cachedAccount) {
      const newAccount = generateWallet(JSON.parse(cachedAccount));
      setAccount(newAccount);
      return;
    }
    const newAccount = generateWallet();
    localStorage.setItem("account", JSON.stringify(newAccount.privateKey));
    setAccount(newAccount);
  }, []);
  return (
    <div className="home-page">
      <h1 className="title">HAPPY SUI 1ST ANNIVERSARY</h1>

      <div className="infos">
        <span>SUI Balance: 100 SUI</span>
        <span>SUI Objects: 100</span>
        <span>Found Object: 1</span>
        <button>Mining</button>
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
