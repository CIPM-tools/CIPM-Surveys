export type ResponseCategory = {
    label: string;
    value: string;
};

export type FixedResponse = {
    category: ResponseCategory[] | ResponseCategory;
};

export type FreeResponse = {};

export type Response = {
    '@_varName': string;
    fixed?: FixedResponse;
    free?: FreeResponse;
};

export type SubQuestion = {
    '@_varName': string;
    text: string;
};

export type Question = {
    text: string;
    response: Response[] | Response;
    subQuestion?: SubQuestion[];
};

export type SectionInfo = {
    text: string;
};

export type Section = {
    sectionInfo: SectionInfo;
    question: Question[];
};

export type QuestionnaireInfo = {
    position: 'after' | 'before';
    text: string;
};

export type Questionnaire = {
    title: string;
    questionnaireInfo: QuestionnaireInfo[];
    section: Section[];
};

export type QuestionnaireXML = {
    questionnaire: Questionnaire;
};
