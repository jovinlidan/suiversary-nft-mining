import { memo, useCallback, useState } from "react";
import copyIcon from "../assets/copy.png";
import checkMarkIcon from "../assets/check-mark.svg";
import { copyToClipboard } from "../utils/common";

interface Props {
  text?: string;
}

const CopyIcon = ({ text }: Props) => {
  const [copied, setCopied] = useState<boolean>(false);
  const handleCopy = useCallback(async () => {
    if (!text) return;
    setCopied(true);
    await copyToClipboard(text);
    setTimeout(() => {
      setCopied(false);
    }, 500);
  }, [text]);
  if (copied) return <img src={checkMarkIcon} className="copy-icon" />;
  return <img src={copyIcon} className="copy-icon" onClick={handleCopy} />;
};

const MemoizedCopyIcon = memo(CopyIcon);
export default MemoizedCopyIcon;
