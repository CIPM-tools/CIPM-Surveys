export type SingleResponseCount = {
    codes: string[];
    count: number;
    relativeFrequency?: number;
};

export type Statistics =
    | { type: 'quantile'; quantile: number; value: number | string };

export type StatisticsCollection = {
    code: string;
    stats: Statistics[];
};

export type ResponseCount = {
    questionCodes: string[];
    counts: SingleResponseCount[];
    stats: StatisticsCollection[];
};
