export type ResponseCategory = {
    label: string;
    value: string;
};

export type FixedResponse = {
    category: ResponseCategory[] | ResponseCategory;
};

export type Response = {
    '@_varName': string;
    fixed: FixedResponse;
};

export type SubQuestion = {
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

export type Questionnaire = {
    section: Section[];
};

export type QuestionnaireXML = {
    questionnaire: Questionnaire;
};
