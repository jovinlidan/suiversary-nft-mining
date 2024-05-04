export type Log = {
  timestamp: number;
  message: string;
  isError?: boolean;
  color?: "bg-green" | "gray" | "blue" | "yellow" | "green";
};

export type LogInput = Omit<Log, "timestamp">;

export type AddNewLog = (log: LogInput) => void;
