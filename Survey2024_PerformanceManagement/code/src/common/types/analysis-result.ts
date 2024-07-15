import { ResponseCount } from './response-count.js';

export type AnalysisResult = {
    responseNumbers: {
        completed: number;
        incomplete: number;
        neverStarted: number;
    };
    relations: ResponseCount[];
    texts: { [key: string]: string[] };
};
