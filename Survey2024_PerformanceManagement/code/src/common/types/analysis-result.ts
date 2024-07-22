import { ResponseCount } from './response-count.js';
import { TextInputResponses } from './TextInputResponses.js';

export type AnalysisResult = {
    responseNumbers: {
        completed: number;
        incomplete: number;
        neverStarted: number;
    };
    relations: ResponseCount[];
    texts: TextInputResponses;
};
