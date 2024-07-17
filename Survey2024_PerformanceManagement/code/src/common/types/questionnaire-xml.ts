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

export type AdditionalText = {
    position: 'title' | 'before' | 'after' | 'during';
    text: string;
};

export type Question = {
    directive?: AdditionalText;
    text: string;
    response: Response[] | Response;
    subQuestion?: SubQuestion[];
};

export type Section = {
    sectionInfo: AdditionalText | AdditionalText[];
    question: Question[] | Question;
};

export type QuestionnaireInfo = {
    position: 'after' | 'before';
    text: string;
};

export type Questionnaire = {
    title: string;
    questionnaireInfo: AdditionalText[];
    section: Section[];
};

export type QuestionnaireXML = {
    questionnaire: Questionnaire;
};
