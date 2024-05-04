export type Log = {
  timestamp: number;
  message: string;
  isError?: boolean;
};

export type LogInput = Omit<Log, "timestamp">;

export type AddNewLog = (log: LogInput) => void;
