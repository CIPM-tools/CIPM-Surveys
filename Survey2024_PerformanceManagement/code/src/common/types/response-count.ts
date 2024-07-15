export type SingleResponseCount = {
    codes: string[];
    count: number;
    relativeFrequency?: number;
};

export type Statistics =
    | { type: 'percentile'; percentile: number; value: number };

export type ResponseCount = {
    questionCodes: string[];
    counts: SingleResponseCount[];
    stats: Statistics[];
};
