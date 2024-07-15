import { SimpleCondition } from "./condition";

export type QuestionTypes = 'single-choice' | 'mulitple-choice' | 'free-text' | 'matrix' | 'other-free-text';

export type QuestionEncoding = {
    parentCode?: string;
    code: string;
    type: QuestionTypes;
    text: string;
    responses: string[];
    statement?: string;
};

export type QuestionSection = {
    title: string;
    encodings: QuestionEncoding[];
};

export type Questions = {
    introduction: {
        title: string;
        infoBefore: string;
        infoAfter: string;
    };
    sections: QuestionSection[];
    conditions: SimpleCondition[];
};
